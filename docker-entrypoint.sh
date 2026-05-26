#!/bin/sh

# Default to UID/GID 1000 if not provided
USER_ID=${PUID:-1000}
GROUP_ID=${PGID:-1000}

# Find if UID/GID exists in the container
EXISTING_USER=$(getent passwd "$USER_ID" | cut -d: -f1)
EXISTING_GROUP=$(getent group "$GROUP_ID" | cut -d: -f1)

# 1. Resolve Group
if [ -z "$EXISTING_GROUP" ]; then
    groupadd -g "$GROUP_ID" axissort
    RUN_GROUP="axissort"
else
    RUN_GROUP="$EXISTING_GROUP"
fi

# 2. Resolve User
if [ -z "$EXISTING_USER" ]; then
    useradd -u "$USER_ID" -g "$GROUP_ID" -m -s /bin/sh axissort
    RUN_USER="axissort"
else
    RUN_USER="$EXISTING_USER"
    # Ensure existing user is in the requested group if it's different
    usermod -g "$GROUP_ID" "$RUN_USER" 2>/dev/null
fi

echo "AxisSort: Starting with PUID=$USER_ID ($RUN_USER) and PGID=$GROUP_ID ($RUN_GROUP)"

# 3. Fix permissions on data directory
# This ensures the DB can always be opened
chown -R "$RUN_USER:$RUN_GROUP" /app/data

# 4. Fix permissions on photo directories if they are mounted
if [ -d "/photos" ]; then
    echo "AxisSort: Ensuring permissions on /photos"
    chown -R "$RUN_USER:$RUN_GROUP" /photos
fi

# 5. Execute the application as the resolved user
exec gosu "$RUN_USER" "$@"
