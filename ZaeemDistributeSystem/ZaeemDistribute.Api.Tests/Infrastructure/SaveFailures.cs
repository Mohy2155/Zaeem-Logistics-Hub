using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ZaeemDistribute.Api.Tests.Infrastructure;

/// <summary>
/// Makes the API's next save throw a chosen exception, so a test can check how the API answers a failure
/// that a race would cause, without having to win the race. Cleared before every test.
/// </summary>
public sealed class SaveFailures : SaveChangesInterceptor
{
    private Func<Exception>? _next;

    public void FailNextSave(Func<Exception> exception) => _next = exception;

    public void Clear() => _next = null;

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var failure = Interlocked.Exchange(ref _next, null);
        if (failure is not null) throw failure();
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
