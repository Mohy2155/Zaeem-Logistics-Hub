# fleet-schedule-view Specification

## Purpose
Defines the Fleet Schedule page (route `/scheduler`): a timeline of machinery bookings by machine type that lets operations staff see who has which equipment and when, and spot free capacity at a glance.

## Requirements

### Requirement: Timeline window and navigation
The schedule SHALL show a 14-day window, starting today by default, with a visible label of the displayed date range. Controls move the window back or forward by 14 days, and a Today control returns to the default window.

#### Scenario: Navigate and return
- **WHEN** the user moves forward two windows and then activates Today
- **THEN** the timeline shows the 14 days starting today, and the range label updates at each step

### Requirement: Booking lanes for overlaps
Bookings of the same machine type that overlap in time SHALL be placed in separate lanes within that machine type's row, so no booking bar covers another. The row height MUST grow to fit the lanes needed.

#### Scenario: Two overlapping bookings
- **WHEN** two Excavator X3000 rentals overlap on the same days
- **THEN** the Excavator row shows two lanes, each bar fully visible

#### Scenario: Non-overlapping bookings share a lane
- **WHEN** two rentals of the same type run back-to-back without overlapping
- **THEN** they are drawn in the same lane

### Requirement: Booking bar content and clipping
Each booking bar SHALL span its rental days within the window and show the client name and plate number when space allows. Bookings that extend beyond the window MUST be visibly marked as continuing past the edge.

#### Scenario: Booking continues past window
- **WHEN** a rental ends after the last day shown
- **THEN** its bar reaches the right edge with a visual cue that it continues

### Requirement: Calendar cues
The timeline SHALL highlight today's column and visually distinguish weekend days.

#### Scenario: Today highlighted
- **WHEN** the default window is shown
- **THEN** the first day column is marked as today

### Requirement: Booking details
Activating a booking bar, by pointer or keyboard, SHALL open a details view showing client, machine, plate, start and end dates, number of days, amount and status badge.

#### Scenario: Keyboard opens details
- **WHEN** a keyboard user focuses a booking bar and presses Enter
- **THEN** the booking details are shown, and focus returns to the bar when they are closed

### Requirement: Excluded bookings
Cancelled rentals SHALL NOT appear on the timeline.

#### Scenario: Cancelled rental hidden
- **WHEN** a rental's status is Cancelled
- **THEN** it is not drawn on the timeline

### Requirement: Narrow-screen schedule
On narrow viewports the timeline SHALL scroll horizontally within its own container while the machine-type column stays fixed in view.

#### Scenario: Phone view
- **WHEN** the schedule is viewed at 390px wide
- **THEN** the machine names remain visible while the day columns scroll horizontally inside the timeline
