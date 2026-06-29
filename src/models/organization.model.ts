import mongoose, { Schema, Document, Model } from "mongoose";
import type { OrganizationType } from "@/types";

/** Mongoose document interface for Organization */
export interface OrganizationDocument extends Document {
  name: string;
  type: OrganizationType;
  description?: string;
  memberIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<OrganizationDocument>(
  {
    name: { type: String, required: true, unique: true },
    type: {
      type: String,
      required: true,
    },
    description: { type: String },
    memberIds: {
      type: [Schema.Types.ObjectId],
      ref: "Person",
      default: [],
    },
  },
  { timestamps: true }
);

OrganizationSchema.index({ type: 1 });

export const OrganizationModel: Model<OrganizationDocument> =
  mongoose.models.Organization ||
  mongoose.model<OrganizationDocument>("Organization", OrganizationSchema);
