#!/bin/bash
set -e

# Named volume が root 所有で作成されるため、node ユーザーに権限を付与
if [ -d /app/packages/functions/node_modules ] && [ "$(stat -c '%u' /app/packages/functions/node_modules)" != "$(id -u node)" ]; then
  chown -R node:node /app/packages/functions/node_modules
fi

exec gosu node "$@"
