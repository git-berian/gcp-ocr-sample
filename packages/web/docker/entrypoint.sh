#!/bin/bash
set -e

# Named volume が root 所有で作成されるため、node ユーザーに権限を付与
if [ -d /app/packages/web/node_modules ] && [ "$(stat -c '%u' /app/packages/web/node_modules)" != "$(id -u node)" ]; then
  chown -R node:node /app/packages/web/node_modules
fi

exec gosu node "$@"
