# SNOMED International Authoring Platform

## Overview

This project is an AngularJS-based web application for the SNOMED International Authoring Platform, designed to support collaborative authoring, review, and management of SNOMED CT content. The application is structured using a "folder per feature" approach, with each major feature encapsulated in its own module and directory.

---

## Key Features

### Project and Task Management
- **Project Dashboard**  
  View and manage projects, including project metadata, lead, promotion, and rebase history.  
  - [Project Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/components/project/project.js)  
  - [Project View](https://github.com/IHTSDO/authoring-ui/blob/master/app/components/project/project.html)
- **Task Management**  
  Create, edit, and track tasks within projects, including task details, status, and assignment.  
  - [Task Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/task-detail/taskDetail.js)  
  - [Task View](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/task-detail/taskDetail.html)
- **Project Locking/Unlocking**  
  Admins and leads can lock/unlock projects and tasks to control editing and promotion.  
  - [Lock/Unlock Logic](https://github.com/IHTSDO/authoring-ui/blob/master/app/components/project/project.js#L530)  
  - [SCA Service](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/sca-service/scaService.js#L1479)

### Collaborative Authoring
- **Concept Editing**  
  Edit SNOMED CT concepts, including descriptions, relationships, and attributes.  
  - [Edit Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/components/edit/edit.js)  
  - [Concept Edit Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/concept-edit/conceptEdit.js)  
  - [Concept Edit View](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/concept-edit/conceptEdit.html)
- **Batch Editing**  
  Create and manage batches of concepts for bulk editing.  
  - [Batch Editing Service](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/batch-editing/batchEditingService.js)  
  - [Batch Editing View](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/batch-editing/batchEditingNgTable.html)
- **Saved Lists**  
  Save and manage lists of concepts for quick access and batch operations.  
  - [Saved List Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/savedList/savedList.js)  
  - [Saved List View](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/savedList/savedList.html)
- **Sidebar Navigation**  
  Access taxonomy, search, saved lists, task details, batch editing, and feedback from a unified sidebar.  
  - [Sidebar Edit Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/sidebar-edit/sidebarEdit.js)  
  - [Sidebar Edit View](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/sidebar-edit/sidebarEdit.html)

### Review and Feedback
- **Review Tasks**  
  Assign and manage review tasks, track concepts to review, and approve or provide feedback.  
  - [Review Tasks Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/components/review-tasks/reviewTasks.js)  
  - [Review Tasks View](https://github.com/IHTSDO/authoring-ui/blob/master/app/components/review-tasks/reviewTasks.html)
- **Feedback System**  
  Authors and reviewers can exchange feedback on concepts, with support for chat-like interactions and notifications.  
  - [Feedback Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/feedback/feedback.js)  
  - [Feedback List View](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/feedback/feedback-list.html)
- **Feedback Tabs**  
  Switch between concepts to review, approved concepts, inferred concepts, and release notes.  
  - [Sidebar Feedback Tabs](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/sidebar-edit/sidebarEdit.html)

### Validation and Classification
- **Validation**  
  Run validation checks on projects and tasks, view validation results, and create tasks for validation errors.  
  - [Validation Service](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/validation/validation.js)  
  - [Validation Modal](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/validation/ticketGenerationSummaryModal.html)
- **Classification**  
  Initiate and monitor classification runs, view classification results, and accept or reject classification changes.  
  - [Classification Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/classification/classification.js)  
  - [Classification View](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/classification/classification.html)

### Merge and Promotion
- **Merge Review**  
  Compare and merge content between tasks, projects, and the mainline, with conflict detection and resolution.  
  - [Conflicts Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/conflicts/conflicts.js)  
  - [Conflicts View](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/conflicts/conflicts.html)
- **Promotion**  
  Promote project content to the mainline, with prerequisite checks and status tracking.  
  - [Promotion Service](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/promotion-service/promotionService.js)  
  - [SCA Service Promotion](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/sca-service/scaService.js#L1479)
- **Rebase**  
  Pull in changes from the mainline to keep projects up to date.  
  - [Project Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/components/project/project.js#L90)

### Release Notes and Exception Management
- **Release Notes**  
  Manage and edit release note line items for projects and branches.  
  - [Release Notes Service](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/release-notes-management-service/rnmService.js)  
  - [Line Item Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/releaseNotes/lineItem.js)  
  - [Line Item View](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/releaseNotes/lineItem.html)
- **Exception Lists**  
  View and manage exception lists for validation and classification.  
  - [Exception List Controller](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/exception-list/exceptionList.js)  
  - [Exception List View](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/exception-list/exceptionList.html)

### User Preferences and Roles
- **User Preferences**  
  Customize color schemes, application view, and layout.  
  - [Account Service](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/accountService/accountService.js)
- **Role-Based Access**  
  Features and actions are controlled based on user roles (Admin, Release Lead, Project Lead, Reviewer, Author, etc.).  
  - [Role Logic](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/accountService/accountService.js#L75)

### Integration and Configuration
- **API Endpoints**  
  Configurable endpoints for SNOMED services, IMS, and other backend systems.  
  - [Config Service](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/config-service/configService.js)  
  - [Endpoint Config](https://github.com/IHTSDO/authoring-ui/blob/master/app/config/endpointConfig.json)
- **WebSocket Notifications**  
  Real-time notifications for server-side events.  
  - [Notification Service](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/notification-service/notificationService.js)
- **Hotkeys**  
  Extensive keyboard shortcuts for navigation and actions (e.g., go to home, projects, review tasks, open browser, etc.).  
  - [Hotkey Bindings](https://github.com/IHTSDO/authoring-ui/blob/master/app/app.js)  
  - [Edit Hotkeys](https://github.com/IHTSDO/authoring-ui/blob/master/app/components/edit/edit.js)  
  - [Concept Edit Hotkeys](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/concept-edit/conceptEdit.js)

### UI and Usability
- **Responsive Design**  
  Layout and components adapt to different screen sizes.  
  - [Main Styles](https://github.com/IHTSDO/authoring-ui/blob/master/app/styles/main.scss)  
  - [Responsive Styles](https://github.com/IHTSDO/authoring-ui/blob/master/app/styles/responsive.scss)
- **Theming and Styling**  
  Customizable themes and styles for improved usability.  
  - [Theme Styles](https://github.com/IHTSDO/authoring-ui/blob/master/app/styles/dark.scss), [https://github.com/IHTSDO/authoring-ui/blob/master/app/styles/light.scss)
- **Accessibility**  
  ARIA support and keyboard navigation.  
  - [Main HTML](https://github.com/IHTSDO/authoring-ui/blob/master/app/index.html)

---

## App Structure
- **Components**: Each major feature (e.g., project, edit, review, codesystem) is implemented as a separate AngularJS module and directory.  
  - [Components Directory](https://github.com/IHTSDO/authoring-ui/blob/master/app/components/)
- **Shared Services**: Common services (e.g., metadata, notification, validation, promotion) are located in the `shared` directory.  
  - [Shared Directory](https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/)
- **Templates**: HTML templates for each feature and shared component.  
  - [Templates](https://github.com/IHTSDO/authoring-ui/blob/master/app/components/), [https://github.com/IHTSDO/authoring-ui/blob/master/app/shared/)
- **Styles**: SCSS files for global and feature-specific styling.  
  - [Styles Directory](https://github.com/IHTSDO/authoring-ui/blob/master/app/styles/)

---

## Install & Build Instructions

### Prerequisites
- Node.js (see [pom.xml](https://github.com/IHTSDO/authoring-ui/blob/master/pom.xml) for version)
- npm
- Grunt (`npm install -g grunt`)
- Bower (`npm install -g bower`)
- Ruby (for SASS/Compass)
- Maven (for deb build)

### Install
```sh
npm install
git submodule update --init --recursive
bower install
gem install compass
```

### Build
```sh
grpclean install   # For deb build
grunt               # For build
grunt serve         # For preview (dev server)
```

### Local Configuration and Testing
- You may need to update your local environment for grunt, bower, and compass to get `grunt serve` to work.
- Run `npm update` to ensure grunt dependencies are up to date.
- Run `gem update --system` to ensure all Ruby gems are up to date.

---

## Example NGINX Configuration

In order to obtain API endpoint information within the local environment and avoid CORS errors when accessing SNOWOWL and IMS endpoints, a configuration similar to the following (very basic) should be used:

```nginx
user 'details here';
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include    mime.types;
    server {
        listen      8080;
        server_name localhost;

        location / {
            root /FileLocation/authoring-ui/dist;
        }
        location /config {
            alias /FileLocation/authoring-ui;
        }

        location /snowowl {
            proxy_pass https://www.example.com/snowowl;
        }

        location /auth {
            proxy_pass https://www.example.com/api/account;
        }
    }
    server {
        listen      8081;
        server_name localhost;

        location / {
            proxy_pass http://127.0.0.1:9000;
        }
        location /config {
            proxy_pass https://www.example.com/config;
        }

        location /snowowl/ihtsdo-sca {
            proxy_pass https://www.example.com/snowowl/ihtsdo-sca;
        }

        location /snowowl {
            proxy_pass https://www.example.com/snowowl;
        }

        location /authoring-services {
            proxy_pass https://www.example.com/authoring-services;
        }

        location /template-service {
            proxy_pass https://www.example.com/template-service;
        }

        location /spellcheck-service {
            proxy_pass https://www.example.com/spellcheck-service;
        }

        location /auth {
            proxy_pass https://www.example.com/api/account;
            proxy_set_header Accept "application/json";
        }

        location /authoring-traceability-service {
            proxy_pass https://www.example.com/authoring-traceability-service;
        }
    }
}
```

To access the site after running nginx, use the URL `local.ihtsdotools.org:8080` (for a local approximation of the deployed site; updates rely on running `grunt`), or `local.ihtsdotools.org:8081` (for local development, all requests except those needing specific handling will be proxied to the livereload server).

These URLs are used so that the browser picks up the authentication cookies used by IMS correctly. Using `localhost` instead will leave the developer unable to log in.

---

## Build & Development Tools
- [Gruntfile.js](https://github.com/IHTSDO/authoring-ui/blob/master/Gruntfile.js)
- [pom.xml](https://github.com/IHTSDO/authoring-ui/blob/master/pom.xml)
- [Karma Config](https://github.com/IHTSDO/authoring-ui/blob/master/test/karma.conf.js)
- [Cypress Tests](https://github.com/IHTSDO/authoring-ui/blob/master/cypress/e2e/test.cy.js)
- [Endpoint Config](https://github.com/IHTSDO/authoring-ui/blob/master/app/config/endpointConfig.json)
- [Validation Config](https://github.com/IHTSDO/authoring-ui/blob/master/validationConfig.json)

---

For more details, see the code and comments in the linked files above.
