import mongoose, { Schema, Document, Model } from "mongoose";
import type { Category } from "@/types";

/** Standing result entry subdocument */
export interface StandingResultSubdoc {
  raceId: mongoose.Types.ObjectId;
  position: number;
  points: number;
  finishTime: number;
}

/** Mongoose document interface for Standing */
export interface StandingDocument extends Document {
  competitionId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  racerId: mongoose.Types.ObjectId;
  category: Category;
  teamId?: mongoose.Types.ObjectId;
  totalPoints: number;
  totalRaces: number;
  position: number;
  results: StandingResultSubdoc[];
  lastUpdated: Date;
}

const StandingResultSchema = new Schema(
  {
    raceId: { type: Schema.Types.ObjectId, ref: "Race", required: true },
    position: { type: Number, required: true, min: 1 },
    points: { type: Number, required: true },
    finishTime: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const StandingSchema = new Schema<StandingDocument>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: "Competition",
      required: true,
    },
    seasonId: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    racerId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    category: {
      type: String,
      required: true,
      enum: ["cat1", "cat2", "cat3", "cat4", "cat5", "beginner"],
    },
    teamId: { type: Schema.Types.ObjectId, ref: "Organization" },
    totalPoints: { type: Number, required: true, default: 0 },
    totalRaces: { type: Number, required: true, default: 0 },
    position: { type: Number, required: true, default: 0 },
    results: { type: [StandingResultSchema], default: [] },
    lastUpdated: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

StandingSchema.index({ competitionId: 1, seasonId: 1, position: 1 });
StandingSchema.index({ racerId: 1, seasonId: 1 });
StandingSchema.index({ category: 1 });

export const StandingModel: Model<StandingDocument> =
  mongoose.models.Standing ||
  mongoose.model<StandingDocument>("Standing", StandingSchema);

// --- Team Standing ---

/** Team member result subdocument */
export interface TeamMemberResultSubdoc {
  racerId: mongoose.Types.ObjectId;
  raceId: mongoose.Types.ObjectId;
  points: number;
}

/** Mongoose document interface for TeamStanding */
export interface TeamStandingDocument extends Document {
  competitionId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  totalPoints: number;
  totalRaces: number;
  position: number;
  memberResults: TeamMemberResultSubdoc[];
  lastUpdated: Date;
}

const TeamMemberResultSchema = new Schema(
  {
    racerId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    raceId: { type: Schema.Types.ObjectId, ref: "Race", required: true },
    points: { type: Number, required: true },
  },
  { _id: false }
);

const TeamStandingSchema = new Schema<TeamStandingDocument>(
  {
    competitionId: {
      type: Schema.Types.ObjectId,
      ref: "Competition",
      required: true,
    },
    seasonId: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    totalPoints: { type: Number, required: true, default: 0 },
    totalRaces: { type: Number, required: true, default: 0 },
    position: { type: Number, required: true, default: 0 },
    memberResults: { type: [TeamMemberResultSchema], default: [] },
    lastUpdated: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

TeamStandingSchema.index({ competitionId: 1, seasonId: 1, position: 1 });
TeamStandingSchema.index({ organizationId: 1, seasonId: 1 });

export const TeamStandingModel: Model<TeamStandingDocument> =
  mongoose.models.TeamStanding ||
  mongoose.model<TeamStandingDocument>("TeamStanding", TeamStandingSchema);
