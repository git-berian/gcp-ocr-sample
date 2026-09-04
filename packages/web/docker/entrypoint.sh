#!/bin/bash
set -e

# Named volume が root 所有で作成されるため、node ユーザーに権限を付与
for dir in /app/packages/web/node_modules; do
  if [ -d "$dir" ] && [ "$(stat -c '%u' "$dir")" != "$(id -u node)" ]; then
    chown -R node:node "$dir"
  fi
done

exec gosu node "$@"
