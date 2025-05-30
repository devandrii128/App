# Performance Metrics

This project tracks various performance metrics to monitor and improve the application's efficiency and user experience.

## Tracked Metrics

The following table shows the key performance metrics that are being monitored in the application.

Project is using Firebase for tracking these metrics. However, not all of them are sent there - some of them are only used internally by the Performance module.

| Metric name | Sent to Firebase | Description | Start time | End time |
|----------|----------|----------|----------|----------|
| `_app_start`   | ✅ | The time between when the user opens the app and when the app is responsive.<br><br>**Platforms:** Android     | Starts when the app's `FirebasePerfProvider` `ContentProvider` completes its `onCreate` method.     | Stops when the first activity's `onResume()` method is called.     |
| `js_loaded`    | ✅ | The time it takes for the JavaScript bundle to load. <br><br>**Platforms:** Android, iOS | **Android:** Starts in the `onCreate` method.<br><br>**iOS:** Starts in the AppDelegate's `didFinishLaunchingWithOptions` method.    | Stops at the first render of the app via native module on the JS side.     |
| `_app_in_foreground`    | ✅ | The time when the app is running in the foreground and available to the user.<br><br>**Platforms:** Android, iOS     | **Android:** Starts when the first activity to reach the foreground has its `onResume()` method called. <br><br>**iOS:** Starts when the application receives the `UIApplicationDidBecomeActiveNotification` notification.   | **Android:** Stops when the last activity to leave the foreground has its `onStop()` method called. <br><br>**iOS:** Stops when it receives the `UIApplicationWillResignActiveNotification` notification.     |
| `_app_in_background`    | ✅ | Time when the app is running in the background.<br><br>**Platforms:** Android, iOS    | **Android:** Starts when the last activity to leave the foreground has its `onStop()` method called. <br><br>**iOS:** Starts when the application receives the `UIApplicationWillResignActiveNotification` notification.   | **Android:** Stops when the first activity to reach the foreground has its `onResume()` method called. <br><br>**iOS:** Stops when it receives the `UIApplicationDidBecomeActiveNotification` notification.     |
| `sidebar_loaded`    | ✅ | Time taken for the Sidebar to load.<br><br>**Platforms:** All      | Starts when the Sidebar is mounted.     | Stops when the LHN finishes laying out.     |
| `calc_most_recent_last_modified_action`    | ✅ | Time taken to find the most recently modified report action or report.<br><br>**Platforms:** All      | Starts when the app reconnects to the network     | Ends when the app reconnects to the network and the most recent report action or report is found.     |
| `open_search`   | ✅ | Time taken to open up the Search Router.<br><br>**Platforms:** All      | Starts when the Search Router icon in LHN is pressed.     | Stops when the list of available options finishes laying out.     |
| `load_search_options`    | ✅ | Time taken to generate the list of options used in the Search Router.<br><br>**Platforms:** All     | Starts when the `getSearchOptions` function is called.     | Stops when the list of available options is generated.     |
| `search_filter_options`    | ✅ | Time taken to filter search options in the Search Router by the given search value.<br><br>**Platforms:** All     | Starts when user types something in the Search Router search input.     | Stops when the list of filtered options is generated.     |
| `trie_initialization`   | ✅ | Time taken to build the emoji trie.<br><br>**Platforms:** All      | Starts when emoji trie begins to build.     | Stops when emoji trie building is complete.     |
| `open_report`    | ✅ | Time taken to open a report.<br><br>**Platforms:** All      | Starts when the row in the `LHNOptionsList` is pressed.     | Stops when the `ReportActionsList` finishes laying out.     |
| `open_report_from_preview`   | ✅ | Time taken to open a report from preview.<br><br>(previously `switch_report_from_preview`)<br><br>**Platforms:** All     | Starts when the user presses the Report Preview.     | Stops when the `ReportActionsList` finishes laying out.     |
| `open_report_thread`   | ✅ | Time taken to open a thread in a report.<br><br>**Platforms:** All      | Starts when user presses Report Action Item.     | Stops when the `ReportActionsList` finishes laying out.     |
| `send_message`    | ✅ | Time taken to send a message.<br><br>**Platforms:** All      | Starts when the new message is sent.     | Stops when the message is being rendered in the chat.     |
| `pusher_ping_pong`    | ✅ | The time it takes to receive a PONG event through Pusher.<br><br>**Platforms:** All      | Starts every minute and repeats on the minute.     | Stops when the event is received from the server.     |
| `open_create_expense`    | ❌ | Time taken to open "Create expense" screen.<br><br>**Platforms:** All      | Starts when the `Create expense` is pressed.     | Stops when the `IOURequestStartPage` finishes laying out.     |
| `open_create_expense_contact`    | ❌ | Time taken to "Create expense" screen.<br><br>**Platforms:** All      | Starts when the `Next` button on `Create expense` screen is pressed.     | Stops when the `IOURequestStepParticipants` finishes laying out.     |
| `open_create_expense_approve`    | ❌ | Time taken to "Create expense" screen.<br><br>**Platforms:** All      | Starts when the `Contact` on `Choose recipient` screen is selected.     | Stops when the `IOURequestStepConfirmation` finishes laying out.     |

## Documentation Maintenance

To ensure this documentation remains accurate and useful, please adhere to the following guidelines when updating performance metrics:

1. **New Metrics**: When a new metric is introduced in the codebase, add it to the table with all relevant details.

2. **Metric Renaming**: If a metric is renamed, update the table entry. Mark the old name as deprecated and include a reference to the new name.

3. **Metric Removal**: If a metric is no longer used, don't delete its entry. Instead, mark it as deprecated in the table and provide a brief explanation.

4. **Code Location Changes**: If the placement of a metric in the code changes, update the "Start time" and "End time" columns to reflect the new location.

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Performance Monitoring](https://firebase.google.com/docs/perf-mon)
