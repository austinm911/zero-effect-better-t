/**
 * Shared error types for zero-effect Drizzle implementations
 * @since 1.0.0
 */
import { Schema } from "effect"

/**
 * @since 1.0.0
 * @category errors
 */
export class ZeroMutatorAuthError extends Schema.TaggedError<ZeroMutatorAuthError>()(
	"ZeroMutatorAuthError",
	{
		cause: Schema.Defect,
		message: Schema.String,
	},
) {}

/**
 * @since 1.0.0
 * @category errors
 */
export class ZeroMutatorValidationError extends Schema.TaggedError<ZeroMutatorValidationError>()(
	"ZeroMutatorValidationError",
	{
		field: Schema.String.pipe(Schema.optional),
		message: Schema.String,
	},
) {}

/**
 * @since 1.0.0
 * @category errors
 */
export class ZeroMutatorDatabaseError extends Schema.TaggedError<ZeroMutatorDatabaseError>()(
	"ZeroMutatorDatabaseError",
	{
		cause: Schema.Defect,
		message: Schema.String,
	},
) {}

/**
 * @since 1.0.0
 * @category errors
 */
export class ZeroMutationProcessingError extends Schema.TaggedError<ZeroMutationProcessingError>()(
	"ZeroMutationProcessingError",
	{
		cause: Schema.Defect.pipe(Schema.optional),
		message: Schema.String,
	},
) {}
