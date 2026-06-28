import mongoose, { Schema, Document, Model } from "mongoose";
import type { ComputationMethod } from "@/types";

// --- Calculated Recognition ---

/** Mongoose document interface for CalculatedRecognition */
export interface CalculatedRecognitionDocument extends Document {
  name: string;
  description: string;
  computationMethod: ComputationMethod;
  criteria: {
    timePeriodDays?: number;
    customFormula?: string;
  };
  badgeUrl: string;
  isActive: boolean;
  createdAt: Date;
}

const RecognitionCriteriaSchema = new Schema(
  {
    timePeriodDays: { type: Number, min: 1 },
    customFormula: { type: String },
  },
  { _id: false }
);

const CalculatedRecognitionSchema = new Schema<CalculatedRecognitionDocument>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    computationMethod: {
      type: String,
      required: true,
      enum: ["most_improved", "biggest_mover", "custom"],
    },
    criteria: { type: RecognitionCriteriaSchema, default: {} },
    badgeUrl: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CalculatedRecognitionSchema.index({ isActive: 1 });

export const CalculatedRecognitionModel: Model<CalculatedRecognitionDocument> =
  mongoose.models.CalculatedRecognition ||
  mongoose.model<CalculatedRecognitionDocument>(
    "CalculatedRecognition",
    CalculatedRecognitionSchema
  );

// --- Earned Recognition ---

/** Mongoose document interface for EarnedRecognition */
export interface EarnedRecognitionDocument extends Document {
  recognitionId: mongoose.Types.ObjectId;
  personId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  computedValue: number;
  earnedAt: Date;
}

const EarnedRecognitionSchema = new Schema<EarnedRecognitionDocument>(
  {
    recognitionId: {
      type: Schema.Types.ObjectId,
      ref: "CalculatedRecognition",
      required: true,
    },
    personId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    seasonId: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    computedValue: { type: Number, required: true },
    earnedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

EarnedRecognitionSchema.index({ recognitionId: 1, seasonId: 1 });
EarnedRecognitionSchema.index({ personId: 1, seasonId: 1 });

export const EarnedRecognitionModel: Model<EarnedRecognitionDocument> =
  mongoose.models.EarnedRecognition ||
  mongoose.model<EarnedRecognitionDocument>(
    "EarnedRecognition",
    EarnedRecognitionSchema
  );
