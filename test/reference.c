#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <libpq-fe.h>

int main(int argc, char* argv[]) {
	if (argc < 2) {
		fputs("Usage: reference <connection-string>\n", stderr);
		return EXIT_FAILURE;
	}

	char* errmsg;
	PQconninfoOption* const options = PQconninfoParse(argv[1], &errmsg);

	if (errmsg != NULL) {
		fwrite("error", sizeof(char), 6, stdout);
		fwrite(errmsg, sizeof(char), strlen(errmsg) + 1, stdout);
		PQfreemem(errmsg);
		return EXIT_SUCCESS;
	}

	if (options == NULL) {
		fputs("Couldn’t allocate memory for options\n", stderr);
		return EXIT_FAILURE;
	}

	fwrite("ok", sizeof(char), 3, stdout);

	PQconninfoOption const* p;

	for (p = options; p->keyword != NULL; p++) {
		if (*p->keyword == '\0') {
			fputs("Unexpected empty keyword\n", stderr);
			return EXIT_FAILURE;
		}

		if (p->val != NULL) {
			fwrite(p->keyword, sizeof(char), strlen(p->keyword) + 1, stdout);
			fwrite(p->val, sizeof(char), strlen(p->val) + 1, stdout);
		}
	}

	putchar('\0');

	for (p = options; p->keyword != NULL; p++) {
		if (p->val == NULL) {
			fwrite(p->keyword, sizeof(char), strlen(p->keyword) + 1, stdout);
		}
	}

	putchar('\0');

	PQconninfoFree(options);
}
