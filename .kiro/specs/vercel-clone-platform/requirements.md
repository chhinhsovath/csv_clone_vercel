# Requirements Document

## Introduction

The Vercel Clone Platform is a web-based deployment and hosting platform built with Next.js and React that enables users to deploy web applications with automatic subdomain provisioning, SSL certificate management, and deployment automation. The system integrates with the existing bash-based subdomain management scripts to provide a modern web interface for managing deployments on the openplp.org domain.

## Glossary

- **Platform**: The Vercel Clone Platform web application
- **User**: A developer or administrator who deploys applications through the Platform
- **Project**: A web application that the User wants to deploy
- **Deployment**: A specific instance of a Project running on the server
- **Subdomain**: A DNS subdomain under openplp.org (e.g., app.openplp.org)
- **Build Process**: The compilation and preparation of Project source code for production
- **Environment Variables**: Configuration values required by a Project at runtime
- **Git Repository**: A version control repository containing Project source code
- **SSL Certificate**: A security certificate enabling HTTPS for a Subdomain
- **Reverse Proxy**: Nginx configuration routing traffic to a Deployment
- **Build Log**: Real-time output from the Build Process
- **Deployment Status**: The current state of a Deployment (building, running, failed, stopped)

## Requirements

### Requirement 1

**User Story:** As a User, I want to authenticate securely to the Platform, so that only authorized users can deploy applications

#### Acceptance Criteria

1. WHEN a User navigates to the Platform login page, THE Platform SHALL display email and password input fields
2. WHEN a User submits valid credentials, THE Platform SHALL create an authenticated session
3. WHEN a User submits invalid credentials, THE Platform SHALL display an error message within 2 seconds
4. WHEN an authenticated User's session expires after 7 days, THE Platform SHALL redirect the User to the login page
5. WHEN a User clicks logout, THE Platform SHALL terminate the session and redirect to the login page

### Requirement 2

**User Story:** As a User, I want to create a new project from a Git repository, so that I can deploy my application

#### Acceptance Criteria

1. WHEN a User clicks "New Project", THE Platform SHALL display a project creation form
2. THE Platform SHALL accept Git repository URLs from GitHub, GitLab, and Bitbucket
3. WHEN a User submits a valid Git repository URL, THE Platform SHALL validate the repository accessibility within 5 seconds
4. WHEN a User provides a project name, THE Platform SHALL validate that the name contains only lowercase letters, numbers, and hyphens
5. THE Platform SHALL generate a unique subdomain based on the project name in the format {project-name}.openplp.org

### Requirement 3

**User Story:** As a User, I want to configure build settings for my project, so that the Platform knows how to build and run my application

#### Acceptance Criteria

1. WHEN a User creates a Project, THE Platform SHALL display build configuration options
2. THE Platform SHALL detect the framework type (Next.js, React, Vue, Node.js, Static) from the repository
3. WHEN a User selects a framework, THE Platform SHALL populate default build commands and output directories
4. THE Platform SHALL allow the User to specify custom build commands up to 500 characters
5. THE Platform SHALL allow the User to specify the port number between 3000 and 9999 where the application will run

### Requirement 4

**User Story:** As a User, I want to add environment variables to my project, so that my application can access configuration values securely

#### Acceptance Criteria

1. WHEN a User navigates to project settings, THE Platform SHALL display an environment variables section
2. WHEN a User adds an environment variable, THE Platform SHALL accept key-value pairs where keys contain only uppercase letters, numbers, and underscores
3. THE Platform SHALL encrypt environment variable values before storing them in the database
4. WHEN a Deployment starts, THE Platform SHALL inject all environment variables into the Build Process
5. THE Platform SHALL prevent environment variable keys from exceeding 100 characters and values from exceeding 10000 characters

### Requirement 5

**User Story:** As a User, I want to trigger a deployment of my project, so that my application becomes accessible on the internet

#### Acceptance Criteria

1. WHEN a User clicks "Deploy", THE Platform SHALL initiate a new Deployment
2. THE Platform SHALL clone the Git Repository to a temporary build directory
3. THE Platform SHALL execute the build commands and capture all output to Build Log
4. WHEN the Build Process completes successfully, THE Platform SHALL start the application on the configured port
5. WHEN the Build Process fails, THE Platform SHALL update Deployment Status to "failed" and preserve the Build Log

### Requirement 6

**User Story:** As a User, I want automatic subdomain and SSL setup, so that my deployment is accessible via HTTPS without manual configuration

#### Acceptance Criteria

1. WHEN a Deployment completes successfully, THE Platform SHALL invoke the subdomain management scripts with the project subdomain
2. THE Platform SHALL configure Nginx reverse proxy to route traffic from the Subdomain to the application port
3. THE Platform SHALL request an SSL Certificate from Let's Encrypt for the Subdomain
4. WHEN SSL Certificate installation fails, THE Platform SHALL retry up to 3 times with 30-second intervals
5. WHEN all SSL attempts fail, THE Platform SHALL update Deployment Status to "running-no-ssl" and notify the User

### Requirement 7

**User Story:** As a User, I want to view real-time build logs, so that I can monitor the deployment progress and debug issues

#### Acceptance Criteria

1. WHEN a Deployment is in progress, THE Platform SHALL display a build logs viewer
2. THE Platform SHALL stream Build Log output to the User interface with less than 2 seconds latency
3. THE Platform SHALL preserve Build Log for at least 30 days after Deployment completion
4. WHEN a User navigates away from the logs page, THE Platform SHALL continue the Build Process
5. THE Platform SHALL display timestamps for each log line in ISO 8601 format

### Requirement 8

**User Story:** As a User, I want to view all my projects and their deployment status, so that I can manage multiple applications

#### Acceptance Criteria

1. WHEN a User navigates to the dashboard, THE Platform SHALL display all Projects owned by the User
2. THE Platform SHALL display the current Deployment Status for each Project
3. THE Platform SHALL display the Subdomain URL for each Project as a clickable link
4. THE Platform SHALL display the last deployment timestamp for each Project
5. THE Platform SHALL update Deployment Status in real-time without requiring page refresh

### Requirement 9

**User Story:** As a User, I want to view deployment history, so that I can track changes and rollback if needed

#### Acceptance Criteria

1. WHEN a User clicks on a Project, THE Platform SHALL display a list of all Deployments for that Project
2. THE Platform SHALL display each Deployment with timestamp, commit hash, status, and duration
3. THE Platform SHALL allow the User to view Build Log for any historical Deployment
4. WHEN a User selects a previous Deployment, THE Platform SHALL provide a "Rollback" option
5. WHEN a User initiates a rollback, THE Platform SHALL redeploy the selected Deployment version

### Requirement 10

**User Story:** As a User, I want to manage running deployments, so that I can stop, restart, or delete applications

#### Acceptance Criteria

1. WHEN a User views a Project, THE Platform SHALL display "Stop", "Restart", and "Delete" actions
2. WHEN a User clicks "Stop", THE Platform SHALL terminate the running application process within 10 seconds
3. WHEN a User clicks "Restart", THE Platform SHALL stop and start the application within 30 seconds
4. WHEN a User clicks "Delete", THE Platform SHALL prompt for confirmation before proceeding
5. WHEN a User confirms deletion, THE Platform SHALL remove the Deployment, Nginx configuration, and SSL Certificate

### Requirement 11

**User Story:** As a User, I want to view resource usage metrics, so that I can monitor my application's performance

#### Acceptance Criteria

1. WHEN a User views a Project, THE Platform SHALL display CPU usage percentage
2. THE Platform SHALL display memory usage in megabytes
3. THE Platform SHALL display request count for the last 24 hours
4. THE Platform SHALL update metrics every 30 seconds
5. THE Platform SHALL display a warning when CPU usage exceeds 80% or memory usage exceeds 90%

### Requirement 12

**User Story:** As a User, I want automatic deployments on Git push, so that my application updates without manual intervention

#### Acceptance Criteria

1. WHEN a User enables automatic deployments, THE Platform SHALL register a webhook with the Git Repository
2. WHEN the Git Repository receives a push to the configured branch, THE Platform SHALL receive a webhook notification
3. WHEN the Platform receives a webhook notification, THE Platform SHALL trigger a new Deployment within 10 seconds
4. THE Platform SHALL validate webhook signatures to ensure authenticity
5. WHEN webhook validation fails, THE Platform SHALL reject the deployment request and log the attempt

### Requirement 13

**User Story:** As a User, I want to configure custom domains, so that my application is accessible via my own domain name

#### Acceptance Criteria

1. WHEN a User navigates to domain settings, THE Platform SHALL display an option to add custom domains
2. WHEN a User adds a custom domain, THE Platform SHALL validate DNS configuration
3. THE Platform SHALL provide DNS configuration instructions showing required A and CNAME records
4. WHEN DNS is correctly configured, THE Platform SHALL request an SSL Certificate for the custom domain
5. THE Platform SHALL update Nginx configuration to route traffic from the custom domain to the Deployment

### Requirement 14

**User Story:** As a User, I want to receive notifications about deployment events, so that I stay informed about my applications

#### Acceptance Criteria

1. WHEN a Deployment succeeds, THE Platform SHALL send a success notification to the User
2. WHEN a Deployment fails, THE Platform SHALL send a failure notification with error details
3. THE Platform SHALL support email notifications
4. THE Platform SHALL display in-app notifications in the user interface
5. WHEN a User clicks a notification, THE Platform SHALL navigate to the relevant Deployment details page

### Requirement 15

**User Story:** As a User, I want to manage team access to projects, so that I can collaborate with other developers

#### Acceptance Criteria

1. WHEN a User views a Project, THE Platform SHALL display a team members section
2. WHEN a User invites a team member by email, THE Platform SHALL send an invitation email
3. THE Platform SHALL support role-based access with "Owner", "Admin", and "Viewer" roles
4. WHEN a team member with "Viewer" role attempts to deploy, THE Platform SHALL deny the action
5. WHEN a team member with "Admin" role performs actions, THE Platform SHALL log the activity with the member's identity
