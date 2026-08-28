const std = @import("std");
const json = std.json;
const mem = std.mem;

const c = @import("c");

const reference_in: []const [:0]const u8 = @import("reference-in.zon");

pub fn main(init: std.process.Init) !void {
	std.debug.print("libpq {}\n", .{c.PQlibVersion()});

	var buf: [0x1000]u8 = undefined;
	var stdout = std.Io.File.stdout().writerStreaming(init.io, &buf);
	var stringify = json.Stringify{
		.writer = &stdout.interface,
	};

	try stringify.beginObject();

	for (reference_in) |test_case| {
		try stringify.objectField(test_case);
		try stringify.beginObject();

		var errmsg: ?[*:0]u8 = undefined;
		const options = c.PQconninfoParse(test_case, @ptrCast(&errmsg));

		if (errmsg != null) {
			try stringify.objectField("err");
			try stringify.write(errmsg);
			c.PQfreemem(errmsg);
		} else {
			if (options == null) {
				return error.OutOfMemory;
			}

			try stringify.objectField("ok");
			try stringify.beginObject();

			var option = options;

			while (option[0].keyword != null) {
				try stringify.objectField(mem.span(option[0].keyword));

				try stringify.write(
					if (option[0].val) |val|
						mem.span(val)
					else
						null
				);

				option += 1;
			}

			c.PQconninfoFree(options);

			try stringify.endObject();
		}

		try stringify.endObject();
	}

	try stringify.endObject();

	try stdout.flush();
}
