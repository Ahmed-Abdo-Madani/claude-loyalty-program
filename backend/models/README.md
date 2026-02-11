# Data Models and Architecture

## Messaging System Architecture

**Current Status (As of Feb 2026)**: The messaging system has been refactored to an **Admin-Business (Email-Only)** model.

### Overview

1.  **Admin Perspective**: 
    -   Admins have a full inbox interface in the dashboard.
    -   Admins can view conversation history, send new messages, and archive threads.
    -   All messages sent by admins are stored in the database (`conversations`, `messages` tables).

2.  **Business Perspective**:
    -   Businesses **DO NOT** have an inbox in their dashboard.
    -   Businesses receive **Email Notifications** for all messages.
    -   These emails contain the full message content.
    -   Businesses cannot reply via the dashboard.

3.  **Communication Flow**:
    -   **Admin -> Business**: Admin sends message via Dashboard -> System saves to DB -> System sends Email to Business.
    -   **Business -> Admin**: Business replies to the email -> Reply goes to `support@...` (or configured reply-to address). 
        -   *Note*: Business replies are **NOT** automatically ingested back into the system's database at this time. They are handled via standard email support channels.

### Database Models

-   **Conversation**: Represents a thread. 
    -   `unread_count_business` is **DEPRECATED** and unused (always 0).
    -   `unread_count_admin` tracks internal system status if needed, though mostly irrelevant for email replies.
-   **Message**: Individual messages.
    -   Stored for audit trails and admin history.
-   **MessageTemplate**: Templates for admins to quickly send messages.

### Analytics

Analytics (`adminMessagingAnalyticsController.js`) tracks:
-   Number of conversations initiated by admins.
-   Message volume sent by admins.
-   Engagement metrics based on *outbound* activity.
