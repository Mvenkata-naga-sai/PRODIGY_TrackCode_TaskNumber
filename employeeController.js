const Employee = require("../models/Employee");

exports.createEmployee = async (req, res) => {
  const emp = await Employee.create(req.body);
  res.json(emp);
};

exports.getEmployees = async (req, res) => {
  const data = await Employee.find();
  res.json(data);
};

exports.updateEmployee = async (req, res) => {
  const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(emp);
};

exports.deleteEmployee = async (req, res) => {
  await Employee.findByIdAndDelete(req.params.id);
  res.json({ msg: "Deleted" });
};
