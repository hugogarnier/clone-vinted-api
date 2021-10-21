const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

// middleware
const isAuthentificated = require("../middleware/isAuthentificated");

// models
const Offer = require("../models/Offer");

// publish announce
router.post("/offer/publish", isAuthentificated, async (req, res) => {
  try {
    if (req.fields.title.length > 50) {
      res.status(400).json({ message: "Title too long max 50 characters" });
    } else if (req.fields.price > 10000) {
      res.status(400).json({ message: "Price too great max price is 10000" });
    } else if (req.fields.description.length > 500) {
      res
        .status(400)
        .json({ message: "Description too long max 500 characters" });
    } else {
      const newOffer = new Offer({
        product_name: req.fields.title,
        product_description: req.fields.description,
        product_price: req.fields.price,
        product_details: [
          { ÉTAT: req.fields.condition },
          { EMPLACEMENT: req.fields.city },
          { MARQUE: req.fields.brand },
          { TAILLE: req.fields.size },
          { COULEUR: req.fields.color },
        ],
        owner: req.user,
      });

      const fileKeys = Object.keys(req.files);
      let results = {};

      if (fileKeys.length === 0) {
        res.json({ message: "No file uploaded!" });
      }
      fileKeys.forEach(async (fileKey) => {
        try {
          const file = req.files[fileKey];
          const result = await cloudinary.uploader.upload(file.path, {
            folder: `/vinted/offers/${newOffer.id}`,
          });
          results[fileKey] = {
            success: true,
            result: result,
          };

          if (Object.keys(results).length === fileKeys.length) {
            // all uploads are done we can response to client
            newOffer.product_image = results;
            await newOffer.save();
            res.json(newOffer);
          }
        } catch (error) {
          return res.json({ error: error.message });
        }
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// modify annouce
router.put("/offer/update/:id", isAuthentificated, async (req, res) => {
  try {
    const offerToUpdate = await Offer.findById(req.params.id);
    if (!offerToUpdate) {
      res.status(400).json({ message: "Unable to find the offer" });
    } else {
      const updateKeys = Object.keys(req.fields);
      const mapping = {
        title: "product_name",
        price: "product_price",
        description: "product_description",
        details: {
          condition: "ÉTAT",
          city: "EMPLACEMENT",
          brand: "MARQUE",
          size: "TAILLE",
          color: "COULEUR",
        },
      };

      updateKeys.map((key) => {
        if (mapping[key]) {
          offerToUpdate[mapping[key]] = req.fields[key];
        } else if (mapping.details[key]) {
          index = offerToUpdate.product_details.findIndex(
            (x) => x[mapping.details[key]]
          );
          offerToUpdate.product_details[index][mapping.details[key]] =
            req.fields[key];
        }
      });

      const fileKeys = Object.keys(req.files);
      let results = {};

      if (fileKeys.length === 0) {
        res.json({ message: "No file uploaded!" });
      }
      const imageKeys = Object.keys(offerToUpdate.product_image);
      imageKeys.forEach(async (imageKey) => {
        try {
          await cloudinary.api.delete_resources([
            offerToUpdate.product_image[imageKey].result.public_id,
          ]);
        } catch (error) {
          return res.json({ error: error.message });
        }
      });

      fileKeys.forEach(async (fileKey) => {
        try {
          const file = req.files[fileKey];
          const result = await cloudinary.uploader.upload(file.path, {
            folder: `/vinted/offers/${offerToUpdate.id}`,
          });
          results[fileKey] = {
            success: true,
            result: result,
          };

          if (Object.keys(results).length === fileKeys.length) {
            offerToUpdate.product_image = results;
            await offerToUpdate.save();
            res.json(offerToUpdate);
          }
        } catch (error) {
          return res.json({ error: error.message });
        }
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// delete annouce
router.delete("/offer/delete/:id", isAuthentificated, async (req, res) => {
  try {
    const offerToDelete = await Offer.findById(req.params.id);
    if (!offerToDelete) {
      res.status(400).json({ message: "Unable to find the offer" });
    } else {
      // cloudinary delete folder
      try {
        const imageKeys = Object.keys(offerToDelete.product_image);
        imageKeys.forEach(async (imageKey) => {
          try {
            await cloudinary.api.delete_resources([
              offerToDelete.product_image[imageKey].result.public_id,
            ]);
          } catch (error) {
            return res.json({ error: error.message });
          }
        });

        await cloudinary.api.delete_folder(`vinted/offers/${req.params.id}`);
        await offerToDelete.delete();
        res.json({ message: "Offer deleted" });
      } catch (error) {
        res.json({ error: error.message });
      }
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// route get offers
router.get("/offers", async (req, res) => {
  try {
    const productName = new RegExp(req.query.title, "i");
    let priceMin = Number(req.query.priceMin);
    let priceMax = Number(req.query.priceMax);
    const limitByRequest = 5;
    let page = Number(req.query.page) * limitByRequest;
    let sortBy = req.query.sort;

    // condition if params not present
    // check if page exists
    page ? page : (page = 0);
    // check if sortBy exists
    sortBy
      ? sortBy === "price-desc"
        ? (sortBy = -1)
        : (sortBy = 1)
      : (sortBy = 1);
    // check if priceMin and Max exists
    priceMin ? priceMin : (priceMin = 0);
    priceMax ? priceMax : (priceMax = 999999);

    // create a const filter with all filters from above
    const filter = {
      product_name: productName,
      product_price: { $gte: priceMin, $lte: priceMax },
    };
    // create a sort with all possiblities
    const sort = { product_price: sortBy };
    // find Offers with filter and sort them
    const offers = await Offer.find(filter)
      .sort(sort)
      .limit(limitByRequest)
      .skip(page);
    const count = await Offer.countDocuments(filter);
    if (offers) {
      res.json({
        count: count,
        page: page ? Number(req.query.page) : 0,
        offers: offers,
      });
    } else {
      res.status(400).json({ message: "Unanble to find the request" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// route get offer/:id
// KEEP IT LAST

router.get("/offer/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const offer = await Offer.findById(id).populate({
      path: "owner",
      select: "account",
    });

    if (offer) {
      res.json(offer);
    } else {
      res.json({ message: "Unable to find this id" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
