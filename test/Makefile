CC = clang
CFLAGS = -std=c17 -Wall -Wextra -Weverything -Wpedantic -Os
CFLAGS += $(shell pkgconf --cflags libpq)
LDFLAGS = $(shell pkgconf --libs libpq)

reference: reference.c
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $<
