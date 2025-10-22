import { NextRequest } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema/auth';
import { userBranches } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Search parameters
    const search = searchParams.get('search') || '';
    const branchId = searchParams.get('branchId') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build query to join user and userBranches
    let query = db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        userBranchId: userBranches.id,
        branchId: userBranches.branchId,
        role: userBranches.role,
        isActive: userBranches.isActive,
        userBranchCreatedAt: userBranches.createdAt
      })
      .from(user)
      .leftJoin(userBranches, eq(user.id, userBranches.userId))
      .limit(limit)
      .offset(offset);
    
    // Apply search filters
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(ilike(user.name, `%${search}%`));
    }
    
    if (branchId) {
      whereConditions.push(eq(userBranches.branchId, branchId));
    }
    
    if (role === "admin" || role === "manager" || role === "cashier" || role === "staff") {
      whereConditions.push(eq(userBranches.role, role)) ;
    }
    
    if (isActive !== null && isActive !== undefined) {
      whereConditions.push(eq(userBranches.isActive, isActive === 'true'));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as typeof query;
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(user.name))  as typeof query
        : query.orderBy(desc(user.name)) as typeof query;
    } else if (sortBy === 'email') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(user.email)) as typeof query 
        : query.orderBy(desc(user.email)) as typeof query;
    } else if (sortBy === 'role') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(userBranches.role)) as typeof query
        : query.orderBy(desc(userBranches.role)) as typeof query;
    } else if (sortBy === 'createdAt') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(user.createdAt)) as typeof query 
        : query.orderBy(desc(user.createdAt)) as typeof query;
    } else {
      query = query.orderBy(desc(user.createdAt)) as typeof query;
    }
    
    const employeesList = await query;
    
    // Get total count for pagination
    let countQuery = db
      .select({ count: count() })
      .from(user)
      .leftJoin(userBranches, eq(user.id, userBranches.userId)) ;
    
    let countWhereConditions = [];
    
    if (search) {
      countWhereConditions.push(ilike(user.name, `%${search}%`));
    }
    
    if (branchId) {
      countWhereConditions.push(eq(userBranches.branchId, branchId));
    }
     
    if (role === "admin" || role === "manager" || role === "cashier" || role === "staff") {
      whereConditions.push(eq(userBranches.role, role));
    }

    if (isActive !== null && isActive !== undefined) {
      countWhereConditions.push(eq(userBranches.isActive, isActive === 'true'));
    }
    
    if (countWhereConditions.length > 0) {
       countQuery.where(and(...countWhereConditions)) ;
    }
    
    const totalCountResult = await countQuery;
    const totalCount = typeof totalCountResult[0].count === 'number' 
      ? totalCountResult[0].count 
      : parseInt(totalCountResult[0].count as string);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: employeesList.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          image: emp.image,
          createdAt: emp.createdAt,
          updatedAt: emp.updatedAt,
          branchId: emp.branchId,
          role: emp.role,
          isActive: emp.isActive
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching employees:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, email, branchId, role, image = null } = body;

    // Validate required fields
    if (!name || !email || !branchId || !role) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Name, email, branchId, and role are required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create or find user
    try {
      const joinDate = new Date();
      const year = joinDate.getFullYear();
      const month = (joinDate.getMonth() + 1).toString().padStart(2, '0');
      const namePrefix = name.substring(0, 3).toUpperCase();
      const customPassword = `${year}${month}${namePrefix}`;

      const signUpResult = await auth.api.signUpEmail({
        body: {
          email,
          password: customPassword,
          name
        }
      });

      if (!signUpResult || !signUpResult.user) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Failed to create user account'
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const userId = signUpResult.user.id;

      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, email));

      let userIdentity;
      if (existingUser.length > 0) {
        userIdentity = existingUser[0].id;
      } else {
        userIdentity = signUpResult.user.id;
      }

      // Check if user already has a branch assignment
      const existingUserBranch = await db
        .select()
        .from(userBranches)
        .where(eq(userBranches.userId, userIdentity));

      if (existingUserBranch.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'User already has a branch assignment'
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const [newUserBranch] = await db
        .insert(userBranches)
        .values({
          id: `ubr_${nanoid(10)}`,
          userId,
          branchId,
          role,
          isActive: true,
          createdAt: new Date()
        })
        .returning();

      const [completeUser] = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          branchId: userBranches.branchId,
          role: userBranches.role,
          isActive: userBranches.isActive
        })
        .from(user)
        .leftJoin(userBranches, eq(user.id, userBranches.userId))
        .where(eq(user.id, userId))
        .limit(1);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Employee created successfully with login credentials. Default password: ${customPassword}`,
          data: completeUser
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('Error creating employee:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Internal server error',
          error: (error as Error).message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error parsing request body:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to parse request body',
        error: (error as Error).message
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}