import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.credit_usage import Credit_usageService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/credit_usage", tags=["credit_usage"])


# ---------- Pydantic Schemas ----------
class Credit_usageData(BaseModel):
    """Entity data schema (for create/update)"""
    amount: int
    action: str
    model: str = None
    project_id: int = None
    description: str = None
    created_at: Optional[datetime] = None


class Credit_usageUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    amount: Optional[int] = None
    action: Optional[str] = None
    model: Optional[str] = None
    project_id: Optional[int] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class Credit_usageResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    amount: int
    action: str
    model: Optional[str] = None
    project_id: Optional[int] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Credit_usageListResponse(BaseModel):
    """List response schema"""
    items: List[Credit_usageResponse]
    total: int
    skip: int
    limit: int


class Credit_usageBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Credit_usageData]


class Credit_usageBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Credit_usageUpdateData


class Credit_usageBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Credit_usageBatchUpdateItem]


class Credit_usageBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Credit_usageListResponse)
async def query_credit_usages(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query credit_usages with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying credit_usages: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Credit_usageService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} credit_usages")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying credit_usages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Credit_usageResponse)
async def get_credit_usage(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single credit_usage by ID (user can only see their own records)"""
    logger.debug(f"Fetching credit_usage with id: {id}, fields={fields}")
    
    service = Credit_usageService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Credit_usage with id {id} not found")
            raise HTTPException(status_code=404, detail="Credit_usage not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching credit_usage {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Credit_usageResponse, status_code=201)
async def create_credit_usage(
    data: Credit_usageData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new credit_usage"""
    logger.debug(f"Creating new credit_usage with data: {data}")
    
    service = Credit_usageService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create credit_usage")
        
        logger.info(f"Credit_usage created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating credit_usage: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating credit_usage: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Credit_usageResponse], status_code=201)
async def create_credit_usages_batch(
    request: Credit_usageBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple credit_usages in a single request"""
    logger.debug(f"Batch creating {len(request.items)} credit_usages")
    
    service = Credit_usageService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} credit_usages successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Credit_usageResponse])
async def update_credit_usages_batch(
    request: Credit_usageBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple credit_usages in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} credit_usages")
    
    service = Credit_usageService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} credit_usages successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Credit_usageResponse)
async def update_credit_usage(
    id: int,
    data: Credit_usageUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing credit_usage (requires ownership)"""
    logger.debug(f"Updating credit_usage {id} with data: {data}")

    service = Credit_usageService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Credit_usage with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Credit_usage not found")
        
        logger.info(f"Credit_usage {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating credit_usage {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating credit_usage {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_credit_usages_batch(
    request: Credit_usageBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple credit_usages by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} credit_usages")
    
    service = Credit_usageService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} credit_usages successfully")
        return {"message": f"Successfully deleted {deleted_count} credit_usages", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_credit_usage(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single credit_usage by ID (requires ownership)"""
    logger.debug(f"Deleting credit_usage with id: {id}")
    
    service = Credit_usageService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Credit_usage with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Credit_usage not found")
        
        logger.info(f"Credit_usage {id} deleted successfully")
        return {"message": "Credit_usage deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting credit_usage {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
