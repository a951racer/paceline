import mongoose, { Schema, Document, Model } from "mongoose";

/** Mongoose document interface for Achievement */
export interface AchievementDocument extends Document {
  name: string;
  description: string;
  triggerCriteria: {
    type: "races_completed";
    threshold: number;
  };
  badgeUrl: string;
  createdAt: Date;
}

const TriggerCriteriaSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["races_completed"],
    },
    threshold: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const AchievementSchema = new Schema<AchievementDocument>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    triggerCriteria: { type: TriggerCriteriaSchema, required: true },
    badgeUrl: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AchievementModel: Model<AchievementDocument> =
  mongoose.models.Achievement ||
  mongoose.model<AchievementDocument>("Achievement", AchievementSchema);

// --- Earned Achievement ---

/** Mongoose document interface for EarnedAchievement */
export interface EarnedAchievementDocument extends Document {
  achievementId: mongoose.Types.ObjectId;
  personId: mongoose.Types.ObjectId;
  leagueId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  earnedAt: Date;
  racesAtTime: number;
}

const EarnedAchievementSchema = new Schema<EarnedAchievementDocument>(
  {
    achievementId: {
      type: Schema.Types.ObjectId,
      ref: "Achievement",
      required: true,
    },
    personId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    leagueId: { type: Schema.Types.ObjectId, required: true, ref: "League" },
    seasonId: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    earnedAt: { type: Date, required: true, default: Date.now },
    racesAtTime: { type: Number, required: true, min: 0 },
  },
  { timestamps: false }
);

// Unique compound index: a person can earn a specific achievement only once per league-season
EarnedAchievementSchema.index(
  { achievementId: 1, personId: 1, seasonId: 1, leagueId: 1 },
  { unique: true }
);

export const EarnedAchievementModel: Model<EarnedAchievementDocument> =
  mongoose.models.EarnedAchievement ||
  mongoose.model<EarnedAchievementDocument>(
    "EarnedAchievement",
    EarnedAchievementSchema
  );
