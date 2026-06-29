import mongoose, { Schema, Document, Model } from "mongoose";
import type { RaceStatus } from "@/types";

/** Location subdocument interface */
export interface RaceLocationSubdoc {
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

/** Mongoose document interface for Race */
export interface RaceDocument extends Document {
  name: string;
  date: Date;
  location: RaceLocationSubdoc;
  raceType: string;
  categories: string[];
  leagueId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  competitionIds: mongoose.Types.ObjectId[];
  officialIds: mongoose.Types.ObjectId[];
  volunteerIds: mongoose.Types.ObjectId[];
  status: RaceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const CoordinatesSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const RaceLocationSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    coordinates: { type: CoordinatesSchema },
  },
  { _id: false }
);

const RaceSchema = new Schema<RaceDocument>(
  {
    name: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: RaceLocationSchema, required: true },
    raceType: {
      type: String,
      required: true,
    },
    categories: {
      type: [String],
      default: [],
    },
    leagueId: { type: Schema.Types.ObjectId, required: true, ref: "League" },
    seasonId: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    competitionIds: {
      type: [Schema.Types.ObjectId],
      ref: "Competition",
      default: [],
    },
    officialIds: {
      type: [Schema.Types.ObjectId],
      ref: "Person",
      default: [],
    },
    volunteerIds: {
      type: [Schema.Types.ObjectId],
      ref: "Person",
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

RaceSchema.index({ leagueId: 1, date: 1 });
RaceSchema.index({ seasonId: 1 });
RaceSchema.index({ date: 1 });
RaceSchema.index({ status: 1 });

export const RaceModel: Model<RaceDocument> =
  mongoose.models.Race ||
  mongoose.model<RaceDocument>("Race", RaceSchema);
