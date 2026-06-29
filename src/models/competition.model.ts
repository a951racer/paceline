import mongoose, { Schema, Document, Model } from "mongoose";
import type {
  CompetitionType,
  ScoringMethodType,
} from "@/types";

/** Eligibility criteria subdocument */
export interface EligibilityCriteriaSubdoc {
  racerCriteria?: {
    categories?: string[];
    firstYearOnly?: boolean;
    minRaces?: number;
  };
  raceCriteria?: {
    raceTypes?: string[];
    specificRaceIds?: mongoose.Types.ObjectId[];
  };
}

/** Scoring method subdocument */
export interface ScoringMethodSubdoc {
  type: ScoringMethodType;
  pointsTable?: Map<string, number>;
  countBestN?: number;
}

/** Mongoose document interface for Competition */
export interface CompetitionDocument extends Document {
  name: string;
  description?: string;
  leagueId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  type: CompetitionType;
  scoringMethod: ScoringMethodSubdoc;
  eligibilityCriteria: EligibilityCriteriaSubdoc;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RacerCriteriaSchema = new Schema(
  {
    categories: {
      type: [String],
    },
    firstYearOnly: { type: Boolean },
    minRaces: { type: Number, min: 0 },
  },
  { _id: false }
);

const RaceCriteriaSchema = new Schema(
  {
    raceTypes: {
      type: [String],
    },
    specificRaceIds: { type: [Schema.Types.ObjectId] },
  },
  { _id: false }
);

const EligibilityCriteriaSchema = new Schema(
  {
    racerCriteria: { type: RacerCriteriaSchema },
    raceCriteria: { type: RaceCriteriaSchema },
  },
  { _id: false }
);

const ScoringMethodSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["points", "time", "position_average"],
    },
    pointsTable: { type: Map, of: Number },
    countBestN: { type: Number, min: 1 },
  },
  { _id: false }
);

const CompetitionSchema = new Schema<CompetitionDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    leagueId: { type: Schema.Types.ObjectId, required: true, ref: "League" },
    seasonId: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    type: {
      type: String,
      required: true,
      enum: ["individual", "team"],
    },
    scoringMethod: { type: ScoringMethodSchema, required: true },
    eligibilityCriteria: { type: EligibilityCriteriaSchema, default: {} },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CompetitionSchema.index({ leagueId: 1, seasonId: 1 });
CompetitionSchema.index({ seasonId: 1 });
CompetitionSchema.index({ isActive: 1 });

export const CompetitionModel: Model<CompetitionDocument> =
  mongoose.models.Competition ||
  mongoose.model<CompetitionDocument>("Competition", CompetitionSchema);
