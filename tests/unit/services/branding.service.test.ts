import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { BrandingService } from "@/services/branding.service";
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
  await BrandingConfigurationModel.deleteMany({});
  service.clearCache();
});

const validBrandingData = {
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
  describe("get()", () => {
    it("should return null when no branding config exists", async () => {
      const result = await service.get();
      expect(result).toBeNull();
    });

    it("should return the branding config when one exists (Req 19.1)", async () => {
      await service.update(validBrandingData);

      const result = await service.get();

      expect(result).not.toBeNull();
      expect(result!.leagueName).toBe("Mountain Bike League");
      expect(result!.mainColors).toEqual(["#FF5733", "#33FF57", "#3357FF"]);
      expect(result!.accentColors).toEqual(["#FFD700"]);
    });

    it("should return cached data on subsequent calls (Req 19.5)", async () => {
      await service.update(validBrandingData);

      // First call populates cache
      const result1 = await service.get();
      // Second call should return cached result
      const result2 = await service.get();

      expect(result1!.leagueName).toBe(result2!.leagueName);
      expect(result1!.mainColors).toEqual(result2!.mainColors);
    });
  });

  describe("update()", () => {
    it("should create branding config when none exists (upsert)", async () => {
      const result = await service.update(validBrandingData);

      expect(result.leagueName).toBe("Mountain Bike League");
      expect(result.logos.square).toBe("https://cdn.example.com/logos/square.png");
      expect(result.logos.horizontal).toBe("https://cdn.example.com/logos/horizontal.png");
      expect(result.logos.vertical).toBe("https://cdn.example.com/logos/vertical.png");
      expect(result.mainColors).toEqual(["#FF5733", "#33FF57", "#3357FF"]);
      expect(result.accentColors).toEqual(["#FFD700"]);
    });

    it("should update existing branding config (Req 19.5)", async () => {
      await service.update(validBrandingData);

      const updated = await service.update({
        ...validBrandingData,
        leagueName: "Updated League Name",
      });

      expect(updated.leagueName).toBe("Updated League Name");

      // Verify only one document exists (singleton)
      const count = await BrandingConfigurationModel.countDocuments();
      expect(count).toBe(1);
    });

    it("should accept 2 accent colors (Req 19.7)", async () => {
      const result = await service.update({
        ...validBrandingData,
        accentColors: ["#FFD700", "#C0C0C0"],
      });

      expect(result.accentColors).toEqual(["#FFD700", "#C0C0C0"]);
    });

    it("should reject when mainColors count is not 3 (Req 19.6)", async () => {
      await expect(
        service.update({
          ...validBrandingData,
          mainColors: ["#FF5733", "#33FF57"] as unknown as [string, string, string],
        })
      ).rejects.toThrow("Exactly 3 main colors are required");
    });

    it("should reject when mainColors count is more than 3 (Req 19.6)", async () => {
      await expect(
        service.update({
          ...validBrandingData,
          mainColors: ["#FF5733", "#33FF57", "#3357FF", "#AABBCC"] as unknown as [string, string, string],
        })
      ).rejects.toThrow("Exactly 3 main colors are required");
    });

    it("should reject when accentColors is empty (Req 19.7)", async () => {
      await expect(
        service.update({
          ...validBrandingData,
          accentColors: [],
        })
      ).rejects.toThrow("1 or 2 accent colors are required");
    });

    it("should reject when accentColors count is more than 2 (Req 19.7)", async () => {
      await expect(
        service.update({
          ...validBrandingData,
          accentColors: ["#FFD700", "#C0C0C0", "#AABBCC"],
        })
      ).rejects.toThrow("1 or 2 accent colors are required");
    });

    it("should reject invalid hex color format in mainColors", async () => {
      await expect(
        service.update({
          ...validBrandingData,
          mainColors: ["#FF5733", "not-a-color", "#3357FF"] as [string, string, string],
        })
      ).rejects.toThrow('Invalid hex color format "not-a-color"');
    });

    it("should reject invalid hex color format in accentColors", async () => {
      await expect(
        service.update({
          ...validBrandingData,
          accentColors: ["rgb(255,0,0)"],
        })
      ).rejects.toThrow('Invalid hex color format "rgb(255,0,0)"');
    });

    it("should reject empty league name", async () => {
      await expect(
        service.update({
          ...validBrandingData,
          leagueName: "",
        })
      ).rejects.toThrow("League name is required");
    });

    it("should reject whitespace-only league name", async () => {
      await expect(
        service.update({
          ...validBrandingData,
          leagueName: "   ",
        })
      ).rejects.toThrow("League name is required");
    });

    it("should reject when square logo is missing (Req 19.9)", async () => {
      await expect(
        service.update({
          ...validBrandingData,
          logos: {
            square: "",
            horizontal: "https://cdn.example.com/logos/horizontal.png",
            vertical: "https://cdn.example.com/logos/vertical.png",
          },
        })
      ).rejects.toThrow("All three logo variants (square, horizontal, vertical) are required");
    });

    it("should reject when horizontal logo is missing (Req 19.9)", async () => {
      await expect(
        service.update({
          ...validBrandingData,
          logos: {
            square: "https://cdn.example.com/logos/square.png",
            horizontal: "",
            vertical: "https://cdn.example.com/logos/vertical.png",
          },
        })
      ).rejects.toThrow("All three logo variants (square, horizontal, vertical) are required");
    });

    it("should invalidate cache after update", async () => {
      await service.update(validBrandingData);

      // Populate cache
      await service.get();

      // Update should invalidate cache
      await service.update({
        ...validBrandingData,
        leagueName: "New Name",
      });

      // Next get() should fetch fresh data
      const result = await service.get();
      expect(result!.leagueName).toBe("New Name");
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
