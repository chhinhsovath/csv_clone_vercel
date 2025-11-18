# Shared Utilities Library

This directory contains shared utility functions used by all three main scripts in the Subdomain Management System.

## Files

### common.sh

The main utility library that provides:

#### Color Output Functions
- `print_success(message)` - Print success message in green
- `print_error(message, hint)` - Print error message in red with optional hint
- `print_warning(message)` - Print warning message in yellow
- `print_info(message)` - Print info message in blue
- `print_step(message)` - Print step message in cyan

#### Error Handling Functions
- `die(message, hint)` - Exit with error message
- `check_success(success_msg, error_msg, hint)` - Check last command status
- `command_exists(command)` - Check if command is available
- `check_root()` - Verify script is running as root

#### Validation Functions
- `validate_domain(domain)` - Validate domain name format
- `validate_port(port)` - Validate port number (1-65535)
- `validate_email(email)` - Validate email address format
- `check_port_listening(port, host)` - Check if port is listening

#### Input Functions
- `prompt_input(prompt, var_name, default)` - Prompt for input with default
- `prompt_confirm(prompt, default)` - Prompt for yes/no confirmation
- `prompt_password(prompt, var_name)` - Prompt for password (no echo)

#### File System Functions
- `backup_file(file)` - Create timestamped backup of file
- `restore_backup(file, backup)` - Restore file from backup

#### HTTP Basic Authentication Functions
- `create_htpasswd(subdomain, username, password)` - Create htpasswd file with bcrypt hashing
- `add_auth_to_config(subdomain)` - Add auth_basic directives to nginx configuration
- `setup_basic_auth(subdomain, username, password)` - Combined function to setup authentication
- `setup_basic_auth_interactive(subdomain)` - Interactive setup with password prompts
- `remove_basic_auth(subdomain)` - Remove authentication from subdomain
- `is_auth_configured(subdomain)` - Check if authentication is configured

## Usage

To use the shared utilities in your script:

```bash
#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the common library
source "${SCRIPT_DIR}/lib/common.sh"

# Enable strict error handling (recommended)
set -e
set -u
set -o pipefail
trap 'print_error "Script failed at line $LINENO"' ERR

# Now you can use the utility functions
check_root

print_step "Validating input..."
if validate_domain "api.openplp.org"; then
    print_success "Domain is valid"
fi

if validate_port 3000; then
    print_success "Port is valid"
fi
```

## Testing

Run the validation test suite:

```bash
bash lib/test_validation.sh
```

This will run 31 tests covering:
- Domain validation (9 tests)
- Port validation (12 tests)
- Email validation (10 tests)

All tests should pass before using the library in production.
