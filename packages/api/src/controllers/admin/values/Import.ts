import {
  Controller,
  PathParams,
  UseBeforeEach,
  MultipartFile,
  PlatformMulterFile,
} from "@tsed/common";
import { Post } from "@tsed/schema";
import { prisma } from "lib/prisma";
import { IsValidPath } from "middlewares/ValidPath";
import { BadRequest } from "@tsed/exceptions";
import { IsAuth } from "middlewares/index";

import {
  HASH_SCHEMA_ARR,
  BASE_ARR,
  BUSINESS_ROLE_ARR,
  DLC_ARR,
  DEPARTMENT_ARR,
  CODES_10_ARR,
  DIVISION_ARR,
  PENAL_CODE_ARR,
} from "@snailycad/schemas";
import {
  type DepartmentType,
  type DriversLicenseCategoryType,
  type EmployeeAsEnum,
  type ShouldDoType,
  type StatusValueType,
  type ValueLicenseType,
  WhatPages,
  ValueType,
  StatusValue,
  Value,
} from "@prisma/client";
import { validateSchema } from "lib/validateSchema";
import { upsertWarningApplicable } from "lib/records/penal-code";

@Controller("/admin/values/import/:path")
@UseBeforeEach(IsAuth, IsValidPath)
export class ValuesController {
  @Post("/")
  async patchValueByPathAndId(
    @MultipartFile("file") file: PlatformMulterFile,
    @PathParams("path") path: string,
  ) {
    const type = this.getTypeFromPath(path);

    if (file.mimetype !== "application/json") {
      throw new BadRequest("invalidImageType");
    }

    const rawBody = file.buffer.toString("utf8");
    let body = null;

    try {
      body = JSON.parse(rawBody);
    } catch {
      body = null;
    }

    if (!body) {
      throw new BadRequest("couldNotParseBody");
    }

    const handler = typeHandlers[type as keyof typeof typeHandlers];
    const data = await handler(body, type);
    return data;
  }

  private getTypeFromPath(path: string): ValueType {
    return path.replace("-", "_").toUpperCase() as ValueType;
  }
}

export const typeHandlers = {
  VEHICLE: async (body: unknown, id?: string) => {
    const data = validateSchema(HASH_SCHEMA_ARR, body);

    return prisma.$transaction(
      data.map((item) => {
        const data = {
          update: {
            hash: item.hash,
            value: createValueObj(item.value, ValueType.VEHICLE, "update"),
          },
          create: {
            hash: item.hash,
            value: createValueObj(item.value, ValueType.VEHICLE, "create"),
          },
        };

        return prisma.vehicleValue.upsert({
          where: { id: String(id) },
          ...data,
          include: { value: true },
        });
      }),
    );
  },
  WEAPON: async (body: unknown, id?: string) => {
    const data = validateSchema(HASH_SCHEMA_ARR, body);

    return prisma.$transaction(
      data.map((item) => {
        const data = {
          update: {
            hash: item.hash,
            value: createValueObj(item.value, ValueType.WEAPON, "update"),
          },
          create: {
            hash: item.hash,
            value: createValueObj(item.value, ValueType.WEAPON, "create"),
          },
        };

        return prisma.weaponValue.upsert({
          include: { value: true },
          where: { id: String(id) },
          ...data,
        });
      }),
    );
  },
  BUSINESS_ROLE: async (body: unknown, id?: string) => {
    const data = validateSchema(BUSINESS_ROLE_ARR, body);

    return prisma.$transaction(
      data.map((item) => {
        const data = {
          update: {
            as: item.as as EmployeeAsEnum,
            value: createValueObj(item.value, ValueType.BUSINESS_ROLE, "update"),
          },
          create: {
            as: item.as as EmployeeAsEnum,
            value: createValueObj(item.value, ValueType.BUSINESS_ROLE, "create"),
          },
        };

        return prisma.employeeValue.upsert({
          where: { id: String(id) },
          ...data,
          include: { value: true },
        });
      }),
    );
  },
  DRIVERSLICENSE_CATEGORY: async (body: unknown, id?: string) => {
    const data = validateSchema(DLC_ARR, body);

    return prisma.$transaction(
      data.map((item) => {
        const data = {
          update: {
            type: item.type as DriversLicenseCategoryType,
            value: createValueObj(item.value, ValueType.DRIVERSLICENSE_CATEGORY, "update"),
          },
          create: {
            type: item.type as DriversLicenseCategoryType,
            value: createValueObj(item.value, ValueType.DRIVERSLICENSE_CATEGORY, "create"),
          },
        };

        return prisma.driversLicenseCategoryValue.upsert({
          where: { id: String(id) },
          ...data,
          include: { value: true },
        });
      }),
    );
  },
  DEPARTMENT: async (body: unknown, id?: string) => {
    const data = validateSchema(DEPARTMENT_ARR, body);

    return prisma.$transaction(
      data.map((item) => {
        const data = {
          update: {
            type: item.type as DepartmentType,
            callsign: item.callsign,
            value: createValueObj(item.value, ValueType.DEPARTMENT, "update"),
            isDefaultDepartment: item.isDefaultDepartment ?? false,
            whitelisted: item.whitelisted ?? false,
          },
          create: {
            type: item.type as DepartmentType,
            callsign: item.callsign,
            value: createValueObj(item.value, ValueType.DEPARTMENT, "create"),
            isDefaultDepartment: item.isDefaultDepartment ?? false,
            whitelisted: item.whitelisted ?? false,
          },
        };

        return prisma.departmentValue.upsert({
          where: { id: String(id) },
          ...data,
          include: { value: true },
        });
      }),
    );
  },
  DIVISION: async (body: unknown, id?: string) => {
    const data = validateSchema(DIVISION_ARR, body);

    return prisma.$transaction(
      data.map((item) => {
        const data = {
          update: {
            callsign: item.callsign,
            department: { connect: { id: item.departmentId } },
            value: createValueObj(item.value, ValueType.DIVISION, "update"),
          },
          create: {
            callsign: item.callsign,
            department: { connect: { id: item.departmentId } },
            value: createValueObj(item.value, ValueType.DIVISION, "create"),
          },
        };

        return prisma.divisionValue.upsert({
          where: { id: String(id) },
          ...data,
          update: {
            value: {
              update: {
                value: {
                  set: item.value,
                },
              },
            },
          },
          include: { value: true, department: { include: { value: true } } },
        });
      }),
    );
  },
  CODES_10: async (body: unknown) => {
    const data = validateSchema(CODES_10_ARR, body);
    const DEFAULT_WHAT_PAGES = [WhatPages.LEO, WhatPages.DISPATCH, WhatPages.EMS_FD];

    return handlePromiseAll(data, async (item) => {
      const whatPages = (item.whatPages?.length ?? 0) <= 0 ? DEFAULT_WHAT_PAGES : item.whatPages;

      const value = await prisma.statusValue.create({
        data: {
          type: item.type as StatusValueType,
          color: item.color,
          shouldDo: item.shouldDo as ShouldDoType,
          whatPages: whatPages as WhatPages[],
          value: createValueObj(item.value, ValueType.CODES_10),
        },
        include: { value: true },
      });

      let last: StatusValue | null = null;
      await Promise.all(
        (item.departments ?? []).map(async (departmentId, idx) => {
          const isLast = idx + 1 === item.departments?.length;
          const statusValue = await prisma.statusValue.update({
            where: { id: value.id },
            data: { departments: { connect: { id: departmentId } } },
            include: isLast
              ? { value: true, departments: { include: { value: true } } }
              : undefined,
          });

          if (isLast) {
            last = statusValue;
          }
        }),
      );

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      return { ...value, ...(last ?? {}) };
    });
  },
  PENAL_CODE: async (body: unknown, id?: string) => {
    const data = validateSchema(PENAL_CODE_ARR, body);
    const penalCode = id && (await prisma.penalCode.findUnique({ where: { id } }));

    return handlePromiseAll(data, async (item) => {
      const data = {
        update: {
          title: item.title,
          description: item.description,
          descriptionData: item.descriptionData ?? [],
          groupId: item.groupId,
          ...(await upsertWarningApplicable(item, penalCode || undefined)),
        },
        create: {
          title: item.title,
          description: item.description,
          descriptionData: item.descriptionData ?? [],
          groupId: item.groupId,
          ...(await upsertWarningApplicable(item)),
        },
      };

      return prisma.penalCode.upsert({
        where: { id: String(id) },
        ...data,
        include: { warningApplicable: true, warningNotApplicable: true },
      });
    });
  },

  GENDER: async (body: unknown, id?: string) => typeHandlers.GENERIC(body, "GENDER", id),
  ETHNICITY: async (body: unknown, id?: string) => typeHandlers.GENERIC(body, "ETHNICITY", id),
  BLOOD_GROUP: async (body: unknown, id?: string) => typeHandlers.GENERIC(body, "BLOOD_GROUP", id),
  IMPOUND_LOT: async (body: unknown, id?: string) => typeHandlers.GENERIC(body, "IMPOUND_LOT", id),
  LICENSE: async (body: unknown, id?: string) => typeHandlers.GENERIC(body, "LICENSE", id),
  OFFICER_RANK: async (body: unknown, id?: string) =>
    typeHandlers.GENERIC(body, "OFFICER_RANK", id),

  GENERIC: async (body: unknown, type: ValueType, id?: string): Promise<Value[]> => {
    const data = validateSchema(BASE_ARR, body);

    return prisma.$transaction(
      data.map((item) => {
        const data = {
          update: {
            isDefault: type === ValueType.LICENSE ? item.isDefault ?? false : false,
            type: type as ValueType,
            value: { set: item.value },
            licenseType:
              type === ValueType.LICENSE ? (item.licenseType as ValueLicenseType) : undefined,
          },
          create: {
            isDefault: type === ValueType.LICENSE ? item.isDefault ?? false : false,
            type: type as ValueType,
            value: item.value,
            licenseType:
              type === ValueType.LICENSE ? (item.licenseType as ValueLicenseType) : undefined,
          },
        };

        return prisma.value.upsert({
          where: { id: String(id) },
          ...data,
        });
      }),
    );
  },
};

function createValueObj(
  value: string,
  type: ValueType,
  updateType: "update" | "create" = "create",
) {
  return {
    [updateType]: {
      isDefault: false,
      type,
      value: updateType === "update" ? { set: value } : value,
    },
  };
}

async function handlePromiseAll<T, R>(
  data: T[],
  handler: (item: T) => Promise<R>,
): Promise<{ success: R[]; failed: number }> {
  let failed = 0;
  const success: R[] = [];

  await Promise.all(
    data.map(async (item) => {
      try {
        const data = await handler(item);
        success.push(data);
      } catch (e) {
        console.error(e);
        failed += 1;
      }
    }),
  );

  return { success, failed };
}
