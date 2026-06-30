const router = require("express").Router();
const ctrl = require("../controllers/employeeController");
const { verifyToken } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");

router.post("/", verifyToken, isAdmin, ctrl.createEmployee);
router.get("/", verifyToken, ctrl.getEmployees);
router.put("/:id", verifyToken, isAdmin, ctrl.updateEmployee);
router.delete("/:id", verifyToken, isAdmin, ctrl.deleteEmployee);

module.exports = router;
