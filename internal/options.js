'use strict';

const DEFAULT_PORT = '5432';
const DEFAULT_OPTION = '';
const DEFAULT_SSL_MODE = 'prefer';
const DEFAULT_GSS_MODE = 'prefer';
const PG_KRB_SRVNAM = 'postgres';
const DEFAULT_TARGET_SESSION_ATTRS = 'any';

const option = (envName, fallbackDefault) => ({
	envName,
	fallbackDefault,
});

// src/interfaces/libpq/fe-connect.c:189: PQconninfoOptions
const OPTIONS = new Map([
	['service', option('PGSERVICE', null)],
	['user', option('PGUSER', null)],
	['password', option('PGPASSWORD', null)],
	['passfile', option('PGPASSFILE', null)],
	['connect_timeout', option('PGCONNECT_TIMEOUT', null)],
	['dbname', option('PGDATABASE', null)],
	['host', option('PGHOST', null)],
	['hostaddr', option('PGHOSTADDR', null)],
	['port', option('PGPORT', DEFAULT_PORT)],
	['client_encoding', option('PGCLIENTENCODING', null)],
	['options', option('PGOPTIONS', DEFAULT_OPTION)],
	['application_name', option('PGAPPNAME', null)],
	['fallback_application_name', option(null, null)],
	['keepalives', option(null, null)],
	['keepalives_idle', option(null, null)],
	['keepalives_interval', option(null, null)],
	['keepalives_count', option(null, null)],
	['tcp_user_timeout', option(null, null)],
	['sslmode', option('PGSSLMODE', DEFAULT_SSL_MODE)],
	['sslcompression', option('PGSSLCOMPRESSION', '0')],
	['sslcert', option('PGSSLCERT', null)],
	['sslkey', option('PGSSLKEY', null)],
	['sslrootcert', option('PGSSLROOTCERT', null)],
	['sslcrl', option('PGSSLCRL', null)],
	['requirepeer', option('PGREQUIREPEER', null)],
	['gssencmode', option('PGGSSENCMODE', DEFAULT_GSS_MODE)],
	['krbsrvname', option('PGKRBSRVNAME', PG_KRB_SRVNAM)],
	['gsslib', option('PGGSSLIB', null)],
	['replication', option(null, null)],
	['target_session_attrs', option('PGTARGETSESSIONATTRS', DEFAULT_TARGET_SESSION_ATTRS)],
]);

module.exports = OPTIONS;
