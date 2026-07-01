import mongoose, { Schema, Document, Model } from "mongoose";
import type { Role, SecurityRole, Category, AuthProvider, CategoryChange, AdminScope } from "@/types";

/** Mongoose document interface for Person */
export interface PersonDocument extends Document {
  name: {
    first: string;
    last: string;
  };
  email: string;
  phone?: string;
  /** @deprecated Use securityRoles and personTypes instead. Kept for backward compatibility during migration. */
  roles: Role[];
  securityRoles: SecurityRole[];
  personTypes: string[];
  adminScope?: AdminScope;
  category?: Category;
  categoryHistory: CategoryChange[];
  usaCyclingLicense?: string;
  organizationIds: mongoose.Types.ObjectId[];
  leagueIds: mongoose.Types.ObjectId[];
  passwordHash?: string;
  authProvider?: AuthProvider;
  authProviderId?: string;
  isRegistered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryChangeSchema = new Schema<CategoryChange>(
  {
    from: {
      type: String,
      enum: ["cat1", "cat2", "cat3", "cat4", "cat5", "beginner", null],
      default: null,
    },
    to: {
      type: String,
      required: true,
      enum: ["cat1", "cat2", "cat3", "cat4", "cat5", "beginner"],
    },
    changedAt: { type: Date, required: true },
    changedBy: { type: String, required: true },
  },
  { _id: false }
);

const PersonSchema = new Schema<PersonDocument>(
  {
    name: {
      first: { type: String, required: true },
      last: { type: String, required: true },
    },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String },
    roles: {
      type: [String],
      enum: ["racer", "volunteer", "mentor", "race_official", "administrator", "super_administrator", "league_administrator"],
      default: [],
    },
    securityRoles: {
      type: [String],
      enum: ["administrator", "super_administrator", "league_administrator"],
      default: [],
    },
    personTypes: {
      type: [String],
      default: [],
    },
    adminScope: {
      type: {
        type: String,
        enum: ["super", "league"],
      },
      leagueIds: {
        type: [Schema.Types.ObjectId],
        ref: "League",
      },
    },
    category: {
      type: String,
      enum: ["cat1", "cat2", "cat3", "cat4", "cat5", "beginner"],
    },
    categoryHistory: { type: [CategoryChangeSchema], default: [] },
    usaCyclingLicense: { type: String },
    organizationIds: {
      type: [Schema.Types.ObjectId],
      ref: "Organization",
      default: [],
    },
    leagueIds: {
      type: [Schema.Types.ObjectId],
      ref: "League",
      default: [],
    },
    passwordHash: { type: String },
    authProvider: {
      type: String,
      enum: ["local", "google", "apple"],
    },
    authProviderId: { type: String },
    isRegistered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PersonSchema.index({ roles: 1 });
PersonSchema.index({ organizationIds: 1 });

export const PersonModel: Model<PersonDocument> =
  mongoose.models.Person ||
  mongoose.model<PersonDocument>("Person", PersonSchema);
