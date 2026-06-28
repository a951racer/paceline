import mongoose, { Schema, Document, Model } from "mongoose";
import type { Category } from "@/types";

/** Mongoose document interface for RaceResult */
export interface RaceResultDocument extends Document {
  raceId: mongoose.Types.ObjectId;
  racerId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  category: Category;
  position: number;
  finishTime: number;
  points?: number;
  createdAt: Date;
  updatedAt: Date;
}

const RaceResultSchema = new Schema<RaceResultDocument>(
  {
    raceId: { type: Schema.Types.ObjectId, ref: "Race", required: true },
    racerId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    seasonId: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    category: {
      type: String,
      required: true,
      enum: ["cat1", "cat2", "cat3", "cat4", "cat5", "beginner"],
    },
    position: { type: Number, required: true, min: 1 },
    finishTime: { type: Number, required: true, min: 0 },
    points: { type: Number },
  },
  { timestamps: true }
);

// Unique compound index to prevent duplicate results for same racer in same race
RaceResultSchema.index({ raceId: 1, racerId: 1 }, { unique: true });
RaceResultSchema.index({ seasonId: 1 });
RaceResultSchema.index({ racerId: 1, seasonId: 1 });

export const RaceResultModel: Model<RaceResultDocument> =
  mongoose.models.RaceResult ||
  mongoose.model<RaceResultDocument>("RaceResult", RaceResultSchema);
