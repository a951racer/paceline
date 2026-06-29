import mongoose, { Schema, Document, Model } from "mongoose";

/** Mongoose document interface for Season */
export interface SeasonDocument extends Document {
  name: string;
  leagueId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SeasonSchema = new Schema<SeasonDocument>(
  {
    name: { type: String, required: true },
    leagueId: { type: Schema.Types.ObjectId, required: true, ref: "League" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SeasonSchema.index({ leagueId: 1, isActive: 1 });
SeasonSchema.index({ isActive: 1 });
SeasonSchema.index({ startDate: 1, endDate: 1 });

export const SeasonModel: Model<SeasonDocument> =
  mongoose.models.Season ||
  mongoose.model<SeasonDocument>("Season", SeasonSchema);
