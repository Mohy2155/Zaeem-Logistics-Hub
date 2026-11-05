using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ZaeemDistribute.Api;

/// <summary>
/// Answers 409 with a "try again" message when a request loses a race with another one: the client's balance
/// changed after it was read (the row version check), or an order waited too long for its turn (the order lock).
/// Any other exception is left to the default handler and stays a 500.
/// </summary>
public sealed class ConflictExceptionHandler(ILogger<ConflictExceptionHandler> logger) : IExceptionHandler
{
    public const string BalanceChangedMessage = "The client's balance changed while this request was being processed. Please try again.";
    public const string OrderBusyMessage = "Another order was being placed at the same time. Please try again.";

    /// <summary>The error number raised when an order cannot get the order lock in time (see OrdersController).</summary>
    public const int OrderLockTimeoutError = 50001;

    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        var message = MessageFor(exception);
        if (message is null) return false;

        // An expected outcome under load, not a fault
        logger.LogInformation("{Method} {Path} refused with 409: {Reason}", context.Request.Method, context.Request.Path, message);
        context.Response.StatusCode = StatusCodes.Status409Conflict;
        await context.Response.WriteAsJsonAsync(new { message }, cancellationToken);
        return true;
    }

    // EF wraps database errors in its own exceptions, so the whole inner-exception chain is checked.
    private static string? MessageFor(Exception? exception)
    {
        for (var e = exception; e is not null; e = e.InnerException)
        {
            if (e is DbUpdateConcurrencyException) return BalanceChangedMessage;
            if (e is SqlException { Number: OrderLockTimeoutError }) return OrderBusyMessage;
        }
        return null;
    }
}
