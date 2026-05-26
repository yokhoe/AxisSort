#!/bin/sh

# Default to UID/GID 1000 if not provided
USER_ID=${PUID:-1000}
GROUP_ID=${PGID:-1000}

echo "AxisSort: Starting with PUID=$USER_ID and PGID=$GROUP_ID"

# Create a group for the app if it doesn't exist
if ! getent group axissort >/dev/null; then
    groupadd -g "$GROUP_ID" axissort
fi

# Create a user for the app if it doesn't exist
if ! getent passwd axissort >/dev/null; then
    useradd -u "$USER_ID" -g "$GROUP_ID" -m -s /bin/sh axissort
fi

# Ensure the app has ownership of the data directory
# This fixes the SQLITE_CANTOPEN issue automatically on startup
chown -R axissort:axissort /app/data

# Execute the application as the specified user
exec gosu axissort "$@"
