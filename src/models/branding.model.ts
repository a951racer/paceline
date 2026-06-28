import mongoose, { Schema, Document, Model } from "mongoose";

/** Mongoose document interface for BrandingConfiguration */
export interface BrandingConfigurationDocument extends Document {
  leagueName: string;
  logos: {
    square: string;
    horizontal: string;
    vertical: string;
  };
  mainColors: [string, string, string];
  accentColors: string[];
  updatedAt: Date;
  updatedBy: mongoose.Types.ObjectId;
}

const LogosSchema = new Schema(
  {
    square: { type: String, required: true },
    horizontal: { type: String, required: true },
    vertical: { type: String, required: true },
  },
  { _id: false }
);

const BrandingConfigurationSchema = new Schema<BrandingConfigurationDocument>(
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
    updatedAt: { type: Date, required: true, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Person", required: true },
  },
  { timestamps: false }
);

export const BrandingConfigurationModel: Model<BrandingConfigurationDocument> =
  mongoose.models.BrandingConfiguration ||
  mongoose.model<BrandingConfigurationDocument>(
    "BrandingConfiguration",
    BrandingConfigurationSchema
  );
