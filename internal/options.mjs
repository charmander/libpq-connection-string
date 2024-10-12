// defaults for USE_SSL
const DEFAULT_PORT = '5432';
const DEFAULT_OPTION = '';
const DEFAULT_CHANNEL_BINDING = 'prefer';
const DEFAULT_SSL_MODE = 'prefer';
const DEFAULT_GSS_MODE = 'prefer';
const PG_KRB_SRVNAM = 'postgres';
const DEFAULT_TARGET_SESSION_ATTRS = 'any';

const option = (envName, fallbackDefault) => ({
	envName,
	fallbackDefault,
});

// src/interfaces/libpq/fe-connect.c:191: PQconninfoOptions
const OPTIONS = new Map([
	['service', option('PGSERVICE', null)],
	['user', option('PGUSER', null)],
	['password', option('PGPASSWORD', null)],
	['passfile', option('PGPASSFILE', null)],
	['channel_binding', option('PGCHANNELBINDING', DEFAULT_CHANNEL_BINDING)],
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
	['sslpassword', option(null, null)],
	['sslrootcert', option('PGSSLROOTCERT', null)],
	['sslcrl', option('PGSSLCRL', null)],
	['sslcrldir', option('PGSSLCRLDIR', null)],
	['sslsni', option('PGSSLSNI', '1')],
	['requirepeer', option('PGREQUIREPEER', null)],
	['ssl_min_protocol_version', option('PGSSLMINPROTOCOLVERSION', 'TLSv1.2')],
	['ssl_max_protocol_version', option('PGSSLMAXPROTOCOLVERSION', null)],
	['gssencmode', option('PGGSSENCMODE', DEFAULT_GSS_MODE)],
	['krbsrvname', option('PGKRBSRVNAME', PG_KRB_SRVNAM)],
	['gsslib', option('PGGSSLIB', null)],
	['replication', option(null, null)],
	['target_session_attrs', option('PGTARGETSESSIONATTRS', DEFAULT_TARGET_SESSION_ATTRS)],
]);

export default OPTIONS;
