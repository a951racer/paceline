import mongoose, { Schema, Document, Model } from "mongoose";
import type { NominationType, NominationStatus } from "@/types";

// --- Award ---

/** Mongoose document interface for Award */
export interface AwardDocument extends Document {
  name: string;
  description: string;
  badgeUrl: string;
  nominationType: NominationType;
  createdAt: Date;
}

const AwardSchema = new Schema<AwardDocument>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    badgeUrl: { type: String, required: true },
    nominationType: {
      type: String,
      required: true,
      enum: ["admin_assigned", "peer_nominated"],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AwardModel: Model<AwardDocument> =
  mongoose.models.Award ||
  mongoose.model<AwardDocument>("Award", AwardSchema);

// --- Assigned Award ---

/** Mongoose document interface for AssignedAward */
export interface AssignedAwardDocument extends Document {
  awardId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  assignedAt: Date;
  source: NominationType;
  nominationId?: mongoose.Types.ObjectId;
}

const AssignedAwardSchema = new Schema<AssignedAwardDocument>(
  {
    awardId: { type: Schema.Types.ObjectId, ref: "Award", required: true },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "Person",
      required: true,
    },
    seasonId: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    assignedAt: { type: Date, required: true, default: Date.now },
    source: {
      type: String,
      required: true,
      enum: ["admin_assigned", "peer_nominated"],
    },
    nominationId: { type: Schema.Types.ObjectId, ref: "PeerNomination" },
  },
  { timestamps: false }
);

AssignedAwardSchema.index({ recipientId: 1, seasonId: 1 });
AssignedAwardSchema.index({ awardId: 1 });

export const AssignedAwardModel: Model<AssignedAwardDocument> =
  mongoose.models.AssignedAward ||
  mongoose.model<AssignedAwardDocument>("AssignedAward", AssignedAwardSchema);

// --- Peer Nomination ---

/** Mongoose document interface for PeerNomination */
export interface PeerNominationDocument extends Document {
  nominatorId: mongoose.Types.ObjectId;
  nomineeId: mongoose.Types.ObjectId;
  awardId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  reason?: string;
  status: NominationStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
}

const PeerNominationSchema = new Schema<PeerNominationDocument>(
  {
    nominatorId: {
      type: Schema.Types.ObjectId,
      ref: "Person",
      required: true,
    },
    nomineeId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    awardId: { type: Schema.Types.ObjectId, ref: "Award", required: true },
    seasonId: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    reason: { type: String },
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Person" },
    reviewedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Custom validation: nominatorId !== nomineeId
PeerNominationSchema.path("nomineeId").validate({
  validator: function (this: PeerNominationDocument, value: mongoose.Types.ObjectId) {
    return !this.nominatorId || value.toString() !== this.nominatorId.toString();
  },
  message: "A person cannot nominate themselves",
});

PeerNominationSchema.index({ nomineeId: 1, seasonId: 1 });
PeerNominationSchema.index({ nominatorId: 1 });
PeerNominationSchema.index({ status: 1 });

export const PeerNominationModel: Model<PeerNominationDocument> =
  mongoose.models.PeerNomination ||
  mongoose.model<PeerNominationDocument>(
    "PeerNomination",
    PeerNominationSchema
  );
