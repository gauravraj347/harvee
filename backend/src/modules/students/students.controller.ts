import type { Request, Response } from "express";
import { studentRegistrationSchema } from "./students.schema";
import * as studentsService from "./students.service";

export async function listStudents(_req: Request, res: Response) {
  res.json(await studentsService.listStudents());
}

export async function registerStudent(req: Request, res: Response) {
  const data = studentRegistrationSchema.parse(req.body);
  const student = await studentsService.registerStudent(data);
  res.status(201).json(student);
}
