import mongoose, { Schema, Document, Model } from "mongoose";

/** Branding logos subdocument */
export interface LeagueBrandingLogosSubdoc {
  square: string;
  horizontal: string;
  vertical: string;
}

/** Branding subdocument embedded in League */
export interface LeagueBrandingSubdoc {
  leagueName: string;
  logos: LeagueBrandingLogosSubdoc;
  mainColors: [string, string, string];
  accentColors: string[];
}

/** Mongoose document interface for League */
export interface LeagueDocument extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  branding: LeagueBrandingSubdoc;
  createdAt: Date;
  updatedAt: Date;
}

const LogosSchema = new Schema(
  {
    square: { type: String, required: true },
    horizontal: { type: String, required: true },
    vertical: { type: String, required: true },
  },
  { _id: false }
);

const BrandingSchema = new Schema(
  {
    leagueName: { type: String, required: true },
    logos: { type: LogosSchema, required: true },
    mainColors: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v.length === 3;
        },
        message: "mainColors must contain exactly 3 colors",
      },
    },
    accentColors: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v.length === 1 || v.length === 2;
        },
        message: "accentColors must contain 1 or 2 colors",
      },
    },
  },
  { _id: false }
);

const LeagueSchema = new Schema<LeagueDocument>(
  {
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    branding: { type: BrandingSchema, required: true },
  },
  { timestamps: true }
);

LeagueSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export const LeagueModel: Model<LeagueDocument> =
  mongoose.models.League ||
  mongoose.model<LeagueDocument>("League", LeagueSchema);
