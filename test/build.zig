const std = @import("std");

pub fn build(b: *std.Build) void {
	const target = b.standardTargetOptions(.{});
	const optimize = b.standardOptimizeOption(.{ .preferred_optimize_mode = .ReleaseSmall });

	const translate_c = b.addTranslateC(.{
		.root_source_file = b.path("c.h"),
		.target = target,
		.optimize = optimize,
	});

	const exe = b.addExecutable(.{
		.name = "gen-reference",
		.root_module = b.createModule(.{
			.root_source_file = b.path("gen-reference.zig"),
			.target = target,
			.optimize = optimize,
			.single_threaded = true,
			.imports = &.{
				.{
					.name = "c",
					.module = translate_c.createModule(),
				},
			},
		}),
	});

	exe.root_module.linkSystemLibrary("libpq", .{});

	if (optimize == .ReleaseSmall) {
		exe.root_module.unwind_tables = .none;
		exe.root_module.omit_frame_pointer = true;
		exe.lto = .full;
	}

	const run_cmd = b.addRunArtifact(exe);
	b.step("run", "Run the tool").dependOn(&run_cmd.step);
}
