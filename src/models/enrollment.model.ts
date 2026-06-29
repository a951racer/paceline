import mongoose, { Schema, Document, Model } from "mongoose";

/** Entity type for enrollment - person or organization */
export type EnrollmentEntityType = "person" | "organization";

/** Mongoose document interface for Enrollment */
export interface EnrollmentDocument extends Document {
  entityType: EnrollmentEntityType;
  entityId: mongoose.Types.ObjectId;
  leagueId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  enrolledAt: Date;
  enrolledBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<EnrollmentDocument>(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["person", "organization"],
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    leagueId: { type: Schema.Types.ObjectId, required: true, ref: "League" },
    seasonId: { type: Schema.Types.ObjectId, required: true, ref: "Season" },
    enrolledAt: { type: Date, required: true, default: Date.now },
    enrolledBy: { type: Schema.Types.ObjectId, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique compound index: prevents duplicate enrollments for the same entity in the same league-season
EnrollmentSchema.index(
  { entityType: 1, entityId: 1, leagueId: 1, seasonId: 1 },
  { unique: true }
);

// Index for querying enrollments by league-season (with optional entity type filter)
EnrollmentSchema.index({ leagueId: 1, seasonId: 1, entityType: 1 });

// Index for querying all enrollments for a specific entity
EnrollmentSchema.index({ entityId: 1, entityType: 1 });

export const EnrollmentModel: Model<EnrollmentDocument> =
  mongoose.models.Enrollment ||
  mongoose.model<EnrollmentDocument>("Enrollment", EnrollmentSchema);
