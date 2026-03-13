#!/bin/bash
set -e

# Named volume が root 所有で作成されるため、node ユーザーに権限を付与
if [ -d /app/node_modules ] && [ "$(stat -c '%u' /app/node_modules)" != "$(id -u node)" ]; then
  chown -R node:node /app/node_modules
fi

exec gosu node "$@"
