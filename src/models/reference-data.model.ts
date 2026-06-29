import mongoose, { Schema, Document, Model } from "mongoose";

/** Mongoose document interface for ReferenceData */
export interface ReferenceDataDocument extends Document {
  key: string;
  label: string;
  description?: string;
  sortOrder: number;
  type: "category" | "race_type" | "organization_type" | "person_type";
  leagueId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReferenceDataSchema = new Schema<ReferenceDataDocument>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String },
    sortOrder: { type: Number, required: true },
    type: {
      type: String,
      required: true,
      enum: ["category", "race_type", "organization_type", "person_type"],
    },
    leagueId: {
      type: Schema.Types.ObjectId,
      ref: "League",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound unique index: ensures no duplicate key within the same league and type
ReferenceDataSchema.index(
  { leagueId: 1, type: 1, key: 1 },
  { unique: true }
);

// Query index: optimizes lookups by league, type, active status, sorted by sortOrder
ReferenceDataSchema.index(
  { leagueId: 1, type: 1, isActive: 1, sortOrder: 1 }
);

export const ReferenceDataModel: Model<ReferenceDataDocument> =
  mongoose.models.ReferenceData ||
  mongoose.model<ReferenceDataDocument>("ReferenceData", ReferenceDataSchema);
