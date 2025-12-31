import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  User, 
  Calendar, 
  Tag, 
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  RotateCcw
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { 
  TaskStatus, 
  TaskPriority, 
  TaskType, 
  AdminTask,
  insertTaskSchema,
  TaskStatusColors,
  TaskPriorityColors,
  TaskTypeColors
} from "@shared/schema";

// Extended task type with additional frontend fields
interface ExtendedAdminTask extends AdminTask {
  assigneeName?: string;
  reporterName?: string;
  completedByName?: string;
}

// Task form schema using shared schema
const taskFormSchema = insertTaskSchema.extend({
  assigneeId: z.number().optional().nullable(),
  tags: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

// Task status configurations with icons and additional colors
const statusConfig = {
  [TaskStatus.OPEN]: { 
    label: "Open", 
    icon: Clock, 
    color: TaskStatusColors.open + " dark:bg-blue-900 dark:text-blue-200",
    dotColor: "bg-blue-500 dark:bg-blue-400" 
  },
  [TaskStatus.IN_PROGRESS]: { 
    label: "In Progress", 
    icon: RotateCcw, 
    color: TaskStatusColors.in_progress + " dark:bg-yellow-900 dark:text-yellow-200",
    dotColor: "bg-yellow-500 dark:bg-yellow-400" 
  },
  [TaskStatus.BLOCKED]: { 
    label: "Blocked", 
    icon: AlertTriangle, 
    color: TaskStatusColors.blocked + " dark:bg-red-900 dark:text-red-200",
    dotColor: "bg-red-500 dark:bg-red-400" 
  },
  [TaskStatus.DONE]: { 
    label: "Done", 
    icon: CheckCircle, 
    color: TaskStatusColors.done + " dark:bg-green-900 dark:text-green-200",
    dotColor: "bg-green-500 dark:bg-green-400" 
  },
  [TaskStatus.CANCELLED]: { 
    label: "Cancelled", 
    icon: XCircle, 
    color: TaskStatusColors.cancelled + " dark:bg-gray-900 dark:text-gray-200",
    dotColor: "bg-gray-500 dark:bg-gray-400" 
  },
};

const priorityConfig = {
  [TaskPriority.LOW]: { label: "Low", color: TaskPriorityColors.low + " dark:bg-blue-900 dark:text-blue-200" },
  [TaskPriority.MEDIUM]: { label: "Medium", color: TaskPriorityColors.medium + " dark:bg-yellow-900 dark:text-yellow-200" },
  [TaskPriority.HIGH]: { label: "High", color: TaskPriorityColors.high + " dark:bg-orange-900 dark:text-orange-200" },
  [TaskPriority.URGENT]: { label: "Urgent", color: TaskPriorityColors.urgent + " dark:bg-red-900 dark:text-red-200" },
};

const typeConfig = {
  [TaskType.FEATURE]: { label: "Feature", color: TaskTypeColors.feature + " dark:bg-purple-900 dark:text-purple-200" },
  [TaskType.TASK]: { label: "Task", color: TaskTypeColors.task + " dark:bg-gray-900 dark:text-gray-200" },
  [TaskType.BUG]: { label: "Bug", color: TaskTypeColors.bug + " dark:bg-red-900 dark:text-red-200" },
  [TaskType.IMPROVEMENT]: { label: "Improvement", color: TaskTypeColors.improvement + " dark:bg-green-900 dark:text-green-200" },
};

export default function AdminTasksPage() {
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<TaskStatus>(TaskStatus.DONE);

  const { toast } = useToast();

  // Fetch admin tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["/api/admin/tasks", { 
      q: searchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      priority: priorityFilter !== "all" ? priorityFilter : undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (statusFilter !== "all") params.append('status', statusFilter);
      if (priorityFilter !== "all") params.append('priority', priorityFilter);
      if (typeFilter !== "all") params.append('type', typeFilter);
      
      const url = `/api/admin/tasks${params.toString() ? '?' + params.toString() : ''}`;
      const response = await apiRequest("GET", url);
      return await response.json();
    },
  });

  // Fetch admin users for assignment
  const { data: adminUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  const tasks = (tasksData || []) as ExtendedAdminTask[];
  const admins = Array.isArray(adminUsers) ? adminUsers.filter((user: any) => user.role === 'admin') : [];

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        dueDate: data.dueDate || undefined,
      };
      const response = await apiRequest("POST", "/api/admin/tasks", payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TaskFormData> }) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
        dueDate: data.dueDate || undefined,
      };
      const response = await apiRequest("PATCH", `/api/admin/tasks/${id}`, payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      setShowEditDialog(false);
      setEditingTask(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (taskIds: number[]) => {
      const response = await apiRequest("DELETE", "/api/admin/tasks/bulk", { taskIds });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `Successfully deleted ${data.deletedCount} tasks`,
      });
      setShowBulkDeleteDialog(false);
      setSelectedTasks(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tasks",
        variant: "destructive",
      });
    },
  });

  // Bulk status update mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ taskIds, status }: { taskIds: number[]; status: TaskStatus }) => {
      const response = await apiRequest("PATCH", "/api/admin/tasks/bulk-status", { taskIds, status });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `Successfully updated ${data.updatedCount} tasks to ${statusConfig[data.newStatus as TaskStatus]?.label}`,
      });
      setShowBulkStatusDialog(false);
      setSelectedTasks(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tasks",
        variant: "destructive",
      });
    },
  });

  // Task form
  const taskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: TaskType.TASK,
      priority: TaskPriority.MEDIUM,
      assigneeId: null,
      tags: "",
      dueDate: "",
    },
  });

  // Calculate summary statistics
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const statusCounts = {
      open: 0,
      in_progress: 0,
      blocked: 0,
      done: 0,
      cancelled: 0,
    };

    const priorityCounts = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let unassigned = 0;
    let overdue = 0;
    const now = new Date();

    tasks.forEach((task) => {
      // Status counts
      if (statusCounts.hasOwnProperty(task.status)) {
        statusCounts[task.status as keyof typeof statusCounts]++;
      }

      // Priority counts
      if (priorityCounts.hasOwnProperty(task.priority)) {
        priorityCounts[task.priority as keyof typeof priorityCounts]++;
      }

      // Unassigned
      if (!task.assigneeId) {
        unassigned++;
      }

      // Overdue
      if (task.dueDate && new Date(task.dueDate) < now && task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED) {
        overdue++;
      }
    });

    return {
      total,
      statusCounts,
      priorityCounts,
      unassigned,
      overdue,
    };
  }, [tasks]);

  // Handle form submissions
  const handleCreateSubmit = (data: TaskFormData) => {
    createTaskMutation.mutate(data);
  };

  const handleEditSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    }
  };

  // Bulk operations
  const handleBulkDelete = () => {
    if (selectedTasks.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedTasks));
    }
  };

  const handleBulkStatusUpdate = () => {
    if (selectedTasks.size > 0) {
      bulkStatusMutation.mutate({
        taskIds: Array.from(selectedTasks),
        status: bulkStatusValue,
      });
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(task => task.id)));
    }
  };

  const handleSelectTask = (taskId: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  // Edit task handler
  const handleEditTask = (task: ExtendedAdminTask) => {
    setEditingTask(task);
    taskForm.reset({
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      assigneeId: task.assigneeId || null,
      tags: task.tags?.join(', ') || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
    });
    setShowEditDialog(true);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "No date";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (task: ExtendedAdminTask) => {
    if (!task.dueDate || task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELLED) {
      return false;
    }
    const dueDate = typeof task.dueDate === 'string' ? new Date(task.dueDate) : task.dueDate;
    return dueDate < new Date();
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="page-title">
              Admin Task Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage internal tasks, feature requests, and development items
            </p>
          </div>
          <Button 
            type="button"
            onClickCapture={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Create task button clicked");
              setShowCreateDialog(true);
            }}
            data-testid="button-create-task"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Task
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-tasks">{taskStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Open Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-open-tasks">
                {taskStats.statusCounts.open + taskStats.statusCounts.in_progress}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Unassigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="stat-unassigned-tasks">
                {taskStats.unassigned}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="stat-overdue-tasks">
                {taskStats.overdue}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tasks by title, description, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-tasks"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={TaskStatus.OPEN}>Open</SelectItem>
                  <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={TaskStatus.BLOCKED}>Blocked</SelectItem>
                  <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                  <SelectItem value={TaskStatus.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger data-testid="filter-priority">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value={TaskPriority.URGENT}>Urgent</SelectItem>
                  <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
                  <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="filter-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={TaskType.FEATURE}>Feature</SelectItem>
                  <SelectItem value={TaskType.TASK}>Task</SelectItem>
                  <SelectItem value={TaskType.BUG}>Bug</SelectItem>
                  <SelectItem value={TaskType.IMPROVEMENT}>Improvement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedTasks.size > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700" data-testid="text-selected-count">
                  {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowBulkStatusDialog(true)}
                    data-testid="button-bulk-status"
                  >
                    Update Status
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkDeleteDialog(true)}
                    className="text-red-600 hover:text-red-700"
                    data-testid="button-bulk-delete"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-3 text-gray-600">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">
                  {searchTerm || statusFilter !== "all" || priorityFilter !== "all" || typeFilter !== "all"
                    ? "No tasks match your search criteria"
                    : "No tasks found. Create your first task to get started."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedTasks.size === tasks.length && tasks.length > 0}
                          onCheckedChange={handleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTasks.has(task.id)}
                            onCheckedChange={() => handleSelectTask(task.id)}
                            data-testid={`checkbox-task-${task.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900" data-testid={`text-task-title-${task.id}`}>
                              #{task.id} {task.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {task.description}
                            </div>
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {task.tags.slice(0, 2).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {task.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{task.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={typeConfig[task.type as TaskType]?.color || "bg-gray-100 text-gray-800"} 
                            data-testid={`badge-task-type-${task.id}`}
                          >
                            {typeConfig[task.type as TaskType]?.label || task.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${statusConfig[task.status as TaskStatus]?.dotColor || "bg-gray-500"}`}></div>
                            <Badge 
                              className={statusConfig[task.status as TaskStatus]?.color || "bg-gray-100 text-gray-800"}
                              data-testid={`badge-task-status-${task.id}`}
                            >
                              {statusConfig[task.status as TaskStatus]?.label || task.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={priorityConfig[task.priority as TaskPriority]?.color || "bg-gray-100 text-gray-800"}
                            data-testid={`badge-task-priority-${task.id}`}
                          >
                            {priorityConfig[task.priority as TaskPriority]?.label || task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" data-testid={`text-task-assignee-${task.id}`}>
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">
                              {task.assigneeName || "Unassigned"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.dueDate ? (
                            <div className={`flex items-center gap-1 text-sm ${isOverdue(task) ? 'text-red-600' : 'text-gray-600'}`}>
                              <Calendar className="h-3 w-3" />
                              <span data-testid={`text-task-duedate-${task.id}`}>
                                {formatDate(task.dueDate)}
                              </span>
                              {isOverdue(task) && <span className="text-xs">(Overdue)</span>}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No due date</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600" data-testid={`text-task-created-${task.id}`}>
                            {formatDate(task.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTask(task)}
                            data-testid={`button-edit-task-${task.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Task Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if(!open) taskForm.reset(); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new internal task, feature request, or development item.
              </DialogDescription>
            </DialogHeader>
            <Form {...taskForm}>
              <form onSubmit={taskForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={taskForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Task title" {...field} data-testid="input-create-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-create-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={TaskType.FEATURE}>Feature</SelectItem>
                            <SelectItem value={TaskType.TASK}>Task</SelectItem>
                            <SelectItem value={TaskType.BUG}>Bug</SelectItem>
                            <SelectItem value={TaskType.IMPROVEMENT}>Improvement</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-create-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                            <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
                            <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
                            <SelectItem value={TaskPriority.URGENT}>Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}>
                          <FormControl>
                            <SelectTrigger data-testid="select-create-assignee">
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {admins.map((admin: any) => (
                              <SelectItem key={admin.id} value={admin.id.toString()}>
                                {admin.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-create-duedate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter tags separated by commas" 
                            {...field} 
                            data-testid="input-create-tags"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Task description" 
                            rows={4} 
                            {...field} 
                            data-testid="textarea-create-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    data-testid="button-create-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTaskMutation.isPending}
                    data-testid="button-create-submit"
                  >
                    {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details and assignment.
              </DialogDescription>
            </DialogHeader>
            <Form {...taskForm}>
              <form onSubmit={taskForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={taskForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Task title" {...field} data-testid="input-edit-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={TaskType.FEATURE}>Feature</SelectItem>
                            <SelectItem value={TaskType.TASK}>Task</SelectItem>
                            <SelectItem value={TaskType.BUG}>Bug</SelectItem>
                            <SelectItem value={TaskType.IMPROVEMENT}>Improvement</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                            <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
                            <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
                            <SelectItem value={TaskPriority.URGENT}>Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          defaultValue={field.value ? field.value.toString() : ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-assignee">
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {admins.map((admin: any) => (
                              <SelectItem key={admin.id} value={admin.id.toString()}>
                                {admin.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-edit-duedate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter tags separated by commas" 
                            {...field} 
                            data-testid="input-edit-tags"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Task description" 
                            rows={4} 
                            {...field} 
                            data-testid="textarea-edit-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEditDialog(false)}
                    data-testid="button-edit-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateTaskMutation.isPending}
                    data-testid="button-edit-submit"
                  >
                    {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Bulk Status Update Dialog */}
        <Dialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Task Status</DialogTitle>
              <DialogDescription>
                Change the status of {selectedTasks.size} selected task{selectedTasks.size !== 1 ? 's' : ''}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">New Status</label>
                <Select value={bulkStatusValue} onValueChange={(value) => setBulkStatusValue(value as TaskStatus)}>
                  <SelectTrigger data-testid="select-bulk-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TaskStatus.OPEN}>Open</SelectItem>
                    <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                    <SelectItem value={TaskStatus.BLOCKED}>Blocked</SelectItem>
                    <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                    <SelectItem value={TaskStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkStatusDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleBulkStatusUpdate} 
                disabled={bulkStatusMutation.isPending}
                data-testid="button-bulk-status-confirm"
              >
                {bulkStatusMutation.isPending ? "Updating..." : "Update Tasks"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation */}
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tasks</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedTasks.size} selected task{selectedTasks.size !== 1 ? 's' : ''}? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-bulk-delete-confirm"
              >
                {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Tasks"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}