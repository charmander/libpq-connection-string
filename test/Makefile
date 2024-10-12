CC = clang
CFLAGS = -std=c17 -Os
CFLAGS += -Wall -Wextra -Wpedantic -Weverything -Wno-declaration-after-statement -Wno-unsafe-buffer-usage
CFLAGS += $(shell pkgconf --cflags libpq)
LDFLAGS = $(shell pkgconf --libs libpq)

reference: reference.c
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $<
