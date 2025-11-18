# Logging and Monitoring Functions

This document describes the logging and monitoring module implemented in `common.sh`.

## Overview

The logging module provides comprehensive log management capabilities for subdomain configurations, including viewing, monitoring, and managing log files for both access and error logs.

## Functions

### Core Functions

#### `get_log_path(subdomain, log_type)`
Returns the full path to a log file for a given subdomain.

**Parameters:**
- `subdomain`: The subdomain name (e.g., "api.openplp.org")
- `log_type`: Type of log - "access" or "error" (default: "error")

**Returns:** Log file path string

**Example:**
```bash
log_path=$(get_log_path "api.openplp.org" "error")
# Returns: /var/log/nginx/api.openplp.org_error.log
```

---

#### `log_file_exists(subdomain, log_type)`
Checks if a log file exists for a subdomain.

**Parameters:**
- `subdomain`: The subdomain name
- `log_type`: Type of log - "access" or "error" (default: "error")

**Returns:** 
- 0 if log file exists
- 1 if log file does not exist

**Example:**
```bash
if log_file_exists "api.openplp.org" "error"; then
    echo "Error log exists"
fi
```

---

#### `view_logs(subdomain, log_type, lines)`
Displays the last N lines of a log file.

**Parameters:**
- `subdomain`: The subdomain name
- `log_type`: Type of log - "access" or "error" (default: "error")
- `lines`: Number of lines to display (default: 50)

**Returns:**
- 0 if successful
- 1 if failed (log file not found, invalid parameters)

**Example:**
```bash
# View last 50 lines of error log
view_logs "api.openplp.org" "error"

# View last 100 lines of access log
view_logs "api.openplp.org" "access" 100
```

---

#### `tail_logs(subdomain, log_type)`
Follows a log file in real-time (like `tail -f`).

**Parameters:**
- `subdomain`: The subdomain name
- `log_type`: Type of log - "access" or "error" (default: "error")

**Returns:**
- 0 if successful
- 1 if failed

**Note:** Press Ctrl+C to stop following the log.

**Example:**
```bash
# Follow error log in real-time
tail_logs "api.openplp.org" "error"
```

---

### Interactive Functions

#### `view_logs_interactive(subdomain)`
Provides an interactive menu for viewing logs with options to select log type and choose between viewing recent lines or following in real-time.

**Parameters:**
- `subdomain`: The subdomain name

**Returns:**
- 0 if successful
- 1 if failed

**Example:**
```bash
view_logs_interactive "api.openplp.org"
```

---

### Management Functions

#### `show_log_stats(subdomain)`
Displays statistics about log files including size, line count, and last entry timestamps.

**Parameters:**
- `subdomain`: The subdomain name

**Returns:**
- 0 if successful
- 1 if failed

**Example:**
```bash
show_log_stats "api.openplp.org"
```

**Output:**
```
Log statistics for api.openplp.org:

Access log: 1234 lines, 256K
Last access: 01/Jan/2024:10:30:45

Error log: 45 lines, 8K
Last error: 2024/01/01 10:25:30

Log directory: /var/log/nginx
```

---

#### `set_log_permissions(subdomain)`
Sets appropriate permissions (640) on log files for a subdomain.

**Parameters:**
- `subdomain`: The subdomain name

**Returns:**
- 0 if successful
- 1 if failed

**File Permissions:** 640 (owner: read/write, group: read, others: none)

**Example:**
```bash
set_log_permissions "api.openplp.org"
```

---

#### `list_all_logs()`
Lists all subdomain log files in the nginx log directory.

**Parameters:** None

**Returns:**
- 0 if successful
- 1 if failed

**Example:**
```bash
list_all_logs
```

**Output:**
```
Log files:
  /var/log/nginx/api.openplp.org_access.log (256K, 1234 lines)
  /var/log/nginx/api.openplp.org_error.log (8K, 45 lines)
  /var/log/nginx/app.openplp.org_access.log (512K, 2456 lines)
  /var/log/nginx/app.openplp.org_error.log (12K, 89 lines)

Total log files: 4
```

---

#### `clear_logs(subdomain, log_type)`
Clears (truncates) log files for a subdomain with confirmation prompt.

**Parameters:**
- `subdomain`: The subdomain name
- `log_type`: Type of log - "access", "error", or "all" (default: "all")

**Returns:**
- 0 if successful
- 1 if failed or cancelled

**Warning:** This operation cannot be undone. Use with caution.

**Example:**
```bash
# Clear all logs
clear_logs "api.openplp.org" "all"

# Clear only error log
clear_logs "api.openplp.org" "error"
```

---

## Log File Locations

All subdomain log files are stored in `/var/log/nginx/` with the following naming convention:

- **Access logs:** `/var/log/nginx/[subdomain]_access.log`
- **Error logs:** `/var/log/nginx/[subdomain]_error.log`

Example:
- `/var/log/nginx/api.openplp.org_access.log`
- `/var/log/nginx/api.openplp.org_error.log`

## Log File Permissions

Log files are created with the following permissions:
- **Mode:** 640 (rw-r-----)
- **Owner:** root
- **Group:** adm (or nginx group)

This ensures:
- Root can read and write
- Nginx user (via group) can read
- Other users cannot access

## Log Rotation

Log rotation is handled by the system's `logrotate` utility. The nginx package typically includes a logrotate configuration at `/etc/logrotate.d/nginx` that:

- Rotates logs daily
- Keeps 14 days of logs
- Compresses old logs
- Reloads nginx after rotation

## Requirements Compliance

This module satisfies the following requirements from the specification:

### Requirement 7.1
✅ Separate access and error log files are configured for each subdomain in the nginx configuration template.

### Requirement 7.2
✅ The `view_logs()` function displays the last 50 lines (default) of logs.

### Requirement 7.3
✅ The `tail_logs()` function executes `tail -f` for real-time log following.

### Requirement 7.4
✅ The `set_log_permissions()` function sets appropriate permissions (640) on log files.

### Requirement 7.5
✅ Log rotation is handled by the system's logrotate configuration (standard nginx setup).

## Usage Examples

### View Recent Errors
```bash
source lib/common.sh
view_logs "api.openplp.org" "error" 100
```

### Monitor Logs in Real-Time
```bash
source lib/common.sh
tail_logs "api.openplp.org" "access"
```

### Check Log Statistics
```bash
source lib/common.sh
show_log_stats "api.openplp.org"
```

### Interactive Log Viewer
```bash
source lib/common.sh
view_logs_interactive "api.openplp.org"
```

### List All Subdomain Logs
```bash
source lib/common.sh
list_all_logs
```

## Integration with Main Scripts

The logging functions are designed to be integrated into the main management scripts:

### In `manage-subdomains.sh`
```bash
# Menu option: View logs
case $choice in
    5)
        # Select subdomain
        select_subdomain
        # View logs interactively
        view_logs_interactive "$selected_subdomain"
        ;;
esac
```

### In `setup-subdomain.sh`
```bash
# After successful setup
print_success "Subdomain configured successfully"
print_info "View logs with: view_logs $subdomain error"
```

## Error Handling

All functions include comprehensive error handling:

- **Empty parameters:** Functions validate that required parameters are provided
- **Invalid log types:** Only "access" and "error" are accepted
- **Missing log files:** Functions gracefully handle non-existent log files
- **Permission errors:** Functions check and report permission issues
- **Invalid line counts:** Numeric validation for line count parameters

## Testing

A comprehensive test suite is provided in `test_logging.sh` that validates:

- Log path generation
- Log file existence checking
- Log viewing functionality
- Log statistics display
- Permission management
- Error handling

Run tests with:
```bash
bash lib/test_logging.sh
```

## Notes

- Log files are created automatically by nginx when the subdomain receives traffic
- Empty log files indicate no traffic or errors yet
- Log files grow over time; monitor disk space usage
- Use `clear_logs()` carefully as it permanently deletes log data
- Real-time log following (`tail_logs`) blocks until Ctrl+C is pressed
