import type { Request, Response } from "express";
import { parseId } from "../../common/utils";
import { courseSchema } from "./courses.schema";
import * as coursesService from "./courses.service";

export async function listCourses(_req: Request, res: Response) {
  res.json(await coursesService.listCourses());
}

export async function getCourse(req: Request, res: Response) {
  const course = await coursesService.getCourse(parseId(req.params.id));
  res.json(course);
}

export async function createCourse(req: Request, res: Response) {
  const data = courseSchema.parse(req.body);
  res.status(201).json(await coursesService.createCourse(data));
}

export async function updateCourse(req: Request, res: Response) {
  const data = courseSchema.parse(req.body);
  res.json(await coursesService.updateCourse(parseId(req.params.id), data));
}

export async function deleteCourse(req: Request, res: Response) {
  const id = parseId(req.params.id);
  await coursesService.deleteCourse(id);
  res.json({ deleted: id });
}
