import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { BrandingService } from "@/services/branding.service";
import { LeagueModel } from "@/models/league.model";
import { BrandingConfigurationModel } from "@/models/branding.model";

let mongoServer: MongoMemoryServer;
let service: BrandingService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  service = new BrandingService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.MONGODB_URI;
});

afterEach(async () => {
  await LeagueModel.deleteMany({});
  await BrandingConfigurationModel.deleteMany({});
  service.clearCache();
});

const defaultBranding = {
  leagueName: "Mountain Bike League",
  logos: {
    square: "https://cdn.example.com/logos/square.png",
    horizontal: "https://cdn.example.com/logos/horizontal.png",
    vertical: "https://cdn.example.com/logos/vertical.png",
  },
  mainColors: ["#FF5733", "#33FF57", "#3357FF"] as [string, string, string],
  accentColors: ["#FFD700"],
};

/** Helper to create a league with branding */
async function createLeague(overrides?: Partial<typeof defaultBranding>) {
  const branding = { ...defaultBranding, ...overrides };
  const league = await LeagueModel.create({
    name: branding.leagueName,
    isActive: true,
    branding,
  });
  return league;
}

const validUpdateData = {
  leagueName: "Mountain Bike League",
  logos: {
    square: "https://cdn.example.com/logos/square.png",
    horizontal: "https://cdn.example.com/logos/horizontal.png",
    vertical: "https://cdn.example.com/logos/vertical.png",
  },
  mainColors: ["#FF5733", "#33FF57", "#3357FF"] as [string, string, string],
  accentColors: ["#FFD700"],
  updatedBy: new mongoose.Types.ObjectId().toString(),
};

describe("BrandingService", () => {
  describe("get(leagueId)", () => {
    it("should return null when league does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await service.get(fakeId);
      expect(result).toBeNull();
    });

    it("should return branding from league document (Req 11.1)", async () => {
      const league = await createLeague();

      const result = await service.get(league._id.toString());

      expect(result).not.toBeNull();
      expect(result!.leagueName).toBe("Mountain Bike League");
      expect(result!.mainColors).toEqual(["#FF5733", "#33FF57", "#3357FF"]);
      expect(result!.accentColors).toEqual(["#FFD700"]);
    });

    it("should return cached data on subsequent calls", async () => {
      const league = await createLeague();

      // First call populates cache
      const result1 = await service.get(league._id.toString());
      // Second call should return cached result
      const result2 = await service.get(league._id.toString());

      expect(result1!.leagueName).toBe(result2!.leagueName);
      expect(result1!.mainColors).toEqual(result2!.mainColors);
    });

    it("should return different branding for different leagues (Req 11.3)", async () => {
      const league1 = await createLeague({ leagueName: "League A" });
      const league2 = await LeagueModel.create({
        name: "League B",
        isActive: true,
        branding: {
          ...defaultBranding,
          leagueName: "League B",
          mainColors: ["#111111", "#222222", "#333333"],
        },
      });

      const branding1 = await service.get(league1._id.toString());
      const branding2 = await service.get(league2._id.toString());

      expect(branding1!.leagueName).toBe("League A");
      expect(branding2!.leagueName).toBe("League B");
      expect(branding1!.mainColors).not.toEqual(branding2!.mainColors);
    });
  });

  describe("update(leagueId, data)", () => {
    it("should update branding in the league document (Req 11.2)", async () => {
      const league = await createLeague();

      const result = await service.update(league._id.toString(), {
        ...validUpdateData,
        leagueName: "Updated League Name",
      });

      expect(result.leagueName).toBe("Updated League Name");
      expect(result.logos.square).toBe("https://cdn.example.com/logos/square.png");
      expect(result.mainColors).toEqual(["#FF5733", "#33FF57", "#3357FF"]);
    });

    it("should throw when league is not found", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.update(fakeId, validUpdateData)
      ).rejects.toThrow(`League with id "${fakeId}" not found`);
    });

    it("should accept 2 accent colors (Req 19.7)", async () => {
      const league = await createLeague();

      const result = await service.update(league._id.toString(), {
        ...validUpdateData,
        accentColors: ["#FFD700", "#C0C0C0"],
      });

      expect(result.accentColors).toEqual(["#FFD700", "#C0C0C0"]);
    });

    it("should reject when mainColors count is not 3 (Req 19.6)", async () => {
      const league = await createLeague();

      await expect(
        service.update(league._id.toString(), {
          ...validUpdateData,
          mainColors: ["#FF5733", "#33FF57"] as unknown as [string, string, string],
        })
      ).rejects.toThrow("Exactly 3 main colors are required");
    });

    it("should reject when mainColors count is more than 3 (Req 19.6)", async () => {
      const league = await createLeague();

      await expect(
        service.update(league._id.toString(), {
          ...validUpdateData,
          mainColors: ["#FF5733", "#33FF57", "#3357FF", "#AABBCC"] as unknown as [string, string, string],
        })
      ).rejects.toThrow("Exactly 3 main colors are required");
    });

    it("should reject when accentColors is empty (Req 19.7)", async () => {
      const league = await createLeague();

      await expect(
        service.update(league._id.toString(), {
          ...validUpdateData,
          accentColors: [],
        })
      ).rejects.toThrow("1 or 2 accent colors are required");
    });

    it("should reject when accentColors count is more than 2 (Req 19.7)", async () => {
      const league = await createLeague();

      await expect(
        service.update(league._id.toString(), {
          ...validUpdateData,
          accentColors: ["#FFD700", "#C0C0C0", "#AABBCC"],
        })
      ).rejects.toThrow("1 or 2 accent colors are required");
    });

    it("should reject invalid hex color format in mainColors", async () => {
      const league = await createLeague();

      await expect(
        service.update(league._id.toString(), {
          ...validUpdateData,
          mainColors: ["#FF5733", "not-a-color", "#3357FF"] as [string, string, string],
        })
      ).rejects.toThrow('Invalid hex color format "not-a-color"');
    });

    it("should reject invalid hex color format in accentColors", async () => {
      const league = await createLeague();

      await expect(
        service.update(league._id.toString(), {
          ...validUpdateData,
          accentColors: ["rgb(255,0,0)"],
        })
      ).rejects.toThrow('Invalid hex color format "rgb(255,0,0)"');
    });

    it("should reject empty league name", async () => {
      const league = await createLeague();

      await expect(
        service.update(league._id.toString(), {
          ...validUpdateData,
          leagueName: "",
        })
      ).rejects.toThrow("League name is required");
    });

    it("should reject whitespace-only league name", async () => {
      const league = await createLeague();

      await expect(
        service.update(league._id.toString(), {
          ...validUpdateData,
          leagueName: "   ",
        })
      ).rejects.toThrow("League name is required");
    });

    it("should reject when square logo is missing (Req 19.9)", async () => {
      const league = await createLeague();

      await expect(
        service.update(league._id.toString(), {
          ...validUpdateData,
          logos: {
            square: "",
            horizontal: "https://cdn.example.com/logos/horizontal.png",
            vertical: "https://cdn.example.com/logos/vertical.png",
          },
        })
      ).rejects.toThrow("All three logo variants (square, horizontal, vertical) are required");
    });

    it("should reject when horizontal logo is missing (Req 19.9)", async () => {
      const league = await createLeague();

      await expect(
        service.update(league._id.toString(), {
          ...validUpdateData,
          logos: {
            square: "https://cdn.example.com/logos/square.png",
            horizontal: "",
            vertical: "https://cdn.example.com/logos/vertical.png",
          },
        })
      ).rejects.toThrow("All three logo variants (square, horizontal, vertical) are required");
    });

    it("should invalidate cache after update", async () => {
      const league = await createLeague();

      // Populate cache
      await service.get(league._id.toString());

      // Update should invalidate cache
      await service.update(league._id.toString(), {
        ...validUpdateData,
        leagueName: "New Name",
      });

      // Next get() should fetch fresh data
      const result = await service.get(league._id.toString());
      expect(result!.leagueName).toBe("New Name");
    });
  });

  describe("getLegacy()", () => {
    it("should return null when no legacy branding config exists", async () => {
      const result = await service.getLegacy();
      expect(result).toBeNull();
    });

    it("should return the standalone branding document (deprecated)", async () => {
      await BrandingConfigurationModel.create({
        leagueName: "Legacy League",
        logos: {
          square: "https://cdn.example.com/logos/square.png",
          horizontal: "https://cdn.example.com/logos/horizontal.png",
          vertical: "https://cdn.example.com/logos/vertical.png",
        },
        mainColors: ["#000000", "#111111", "#222222"],
        accentColors: ["#333333"],
        updatedBy: new mongoose.Types.ObjectId(),
      });

      const result = await service.getLegacy();
      expect(result).not.toBeNull();
      expect(result!.leagueName).toBe("Legacy League");
    });
  });

  describe("uploadLogo()", () => {
    const validFile = {
      mimetype: "image/png",
      originalname: "logo.png",
      buffer: Buffer.from("fake-image-data"),
    };

    it("should return a URL for valid logo upload (Req 19.2)", async () => {
      const url = await service.uploadLogo("square", validFile);

      expect(url).toContain("https://cdn.example.com/logos/square-");
      expect(url).toContain(".png");
    });

    it("should accept all valid logo variants", async () => {
      const squareUrl = await service.uploadLogo("square", validFile);
      const horizontalUrl = await service.uploadLogo("horizontal", validFile);
      const verticalUrl = await service.uploadLogo("vertical", validFile);

      expect(squareUrl).toContain("square");
      expect(horizontalUrl).toContain("horizontal");
      expect(verticalUrl).toContain("vertical");
    });

    it("should accept PNG format", async () => {
      const url = await service.uploadLogo("square", {
        ...validFile,
        mimetype: "image/png",
      });
      expect(url).toBeDefined();
    });

    it("should accept JPEG format", async () => {
      const url = await service.uploadLogo("square", {
        ...validFile,
        mimetype: "image/jpeg",
        originalname: "logo.jpg",
      });
      expect(url).toContain(".jpg");
    });

    it("should accept SVG format", async () => {
      const url = await service.uploadLogo("square", {
        ...validFile,
        mimetype: "image/svg+xml",
        originalname: "logo.svg",
      });
      expect(url).toContain(".svg");
    });

    it("should accept WebP format", async () => {
      const url = await service.uploadLogo("square", {
        ...validFile,
        mimetype: "image/webp",
        originalname: "logo.webp",
      });
      expect(url).toContain(".webp");
    });

    it("should reject invalid logo variant", async () => {
      await expect(
        service.uploadLogo("banner", validFile)
      ).rejects.toThrow('Invalid logo variant "banner"');
    });

    it("should reject unsupported file format (Req 19.8)", async () => {
      await expect(
        service.uploadLogo("square", {
          ...validFile,
          mimetype: "image/gif",
        })
      ).rejects.toThrow('Unsupported logo format "image/gif"');
    });

    it("should reject application/pdf format (Req 19.8)", async () => {
      await expect(
        service.uploadLogo("square", {
          ...validFile,
          mimetype: "application/pdf",
        })
      ).rejects.toThrow('Unsupported logo format "application/pdf"');
    });

    it("should reject empty file", async () => {
      await expect(
        service.uploadLogo("square", {
          ...validFile,
          buffer: Buffer.alloc(0),
        })
      ).rejects.toThrow("Logo file is empty");
    });
  });

  describe("validateColors()", () => {
    it("should return true for exactly 3 main colors and 1 accent color (Req 19.6, 19.7)", () => {
      const result = service.validateColors(
        ["#FF5733", "#33FF57", "#3357FF"],
        ["#FFD700"]
      );
      expect(result).toBe(true);
    });

    it("should return true for exactly 3 main colors and 2 accent colors (Req 19.7)", () => {
      const result = service.validateColors(
        ["#FF5733", "#33FF57", "#3357FF"],
        ["#FFD700", "#C0C0C0"]
      );
      expect(result).toBe(true);
    });

    it("should throw for fewer than 3 main colors (Req 19.6)", () => {
      expect(() =>
        service.validateColors(["#FF5733", "#33FF57"], ["#FFD700"])
      ).toThrow("Exactly 3 main colors are required, but 2 provided");
    });

    it("should throw for more than 3 main colors (Req 19.6)", () => {
      expect(() =>
        service.validateColors(
          ["#FF5733", "#33FF57", "#3357FF", "#AABBCC"],
          ["#FFD700"]
        )
      ).toThrow("Exactly 3 main colors are required, but 4 provided");
    });

    it("should throw for 0 accent colors (Req 19.7)", () => {
      expect(() =>
        service.validateColors(["#FF5733", "#33FF57", "#3357FF"], [])
      ).toThrow("1 or 2 accent colors are required, but 0 provided");
    });

    it("should throw for more than 2 accent colors (Req 19.7)", () => {
      expect(() =>
        service.validateColors(
          ["#FF5733", "#33FF57", "#3357FF"],
          ["#FFD700", "#C0C0C0", "#AABBCC"]
        )
      ).toThrow("1 or 2 accent colors are required, but 3 provided");
    });
  });
});
