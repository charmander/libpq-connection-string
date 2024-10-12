A libpq-compatible[^1] connection string parser, like [`PQconninfoParse`][PQconninfoParse].

[^1]: when the connection string is normally encoded as UTF-8 and the C locale is used for `isspace`

```js
import parseConnectionString from 'libpq-connection-string';

parseConnectionString('postgresql://host1:123,host2:456/somedb?target_session_attrs=any&application_name=myapp')
// { … dbname: 'somedb', host: 'host1,host2', port: '123,456' … }

parseConnectionString('host=localhost port=5432 dbname=mydb connect_timeout=10')
// { … connect_timeout: '10', dbname: 'mydb', host: 'localhost', port: '5432' … }
```

All provided option values are parsed as strings, and all non-provided option values are `null`.


## Service files

libpq-connection-string/add-service-defaults-sync is a function to read [service configuration][pgservice] synchronously.

[LDAP][ldap] isn’t supported.


## Environment defaults

libpq-connection-string/add-env-defaults is a function to add libpq defaults (excluding those that come from service files) to parsed options. It reads from:

- environment variables
- the current user’s username, if a user isn’t otherwise specified
- a static set of fallback defaults


## Examples

Getting the defaults that `PQconnect` would use:

```js
import parseConnectionString from 'libpq-connection-string';
import addServiceDefaultsSync from 'libpq-connection-string/add-service-defaults-sync';
import addEnvDefaults from 'libpq-connection-string/add-env-defaults';

const options = parseConnectionString('host=/run/postgres');
addServiceDefaultsSync(options);
addEnvDefaults(options);
```

[PQconninfoParse]: https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-PQCONNINFOPARSE
[pgservice]: https://www.postgresql.org/docs/current/libpq-pgservice.html
[ldap]: https://www.postgresql.org/docs/current/libpq-ldap.html
