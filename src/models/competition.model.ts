import mongoose, { Schema, Document, Model } from "mongoose";
import type {
  CompetitionType,
  ScoringMethodType,
  Category,
  RaceType,
} from "@/types";

/** Eligibility criteria subdocument */
export interface EligibilityCriteriaSubdoc {
  racerCriteria?: {
    categories?: Category[];
    firstYearOnly?: boolean;
    minRaces?: number;
  };
  raceCriteria?: {
    raceTypes?: RaceType[];
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
      enum: ["cat1", "cat2", "cat3", "cat4", "cat5", "beginner"],
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
      enum: ["crit", "time_trial", "road_race", "cyclocross", "gravel", "track"],
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

CompetitionSchema.index({ seasonId: 1 });
CompetitionSchema.index({ isActive: 1 });

export const CompetitionModel: Model<CompetitionDocument> =
  mongoose.models.Competition ||
  mongoose.model<CompetitionDocument>("Competition", CompetitionSchema);
