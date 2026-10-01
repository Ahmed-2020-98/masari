<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    /**
     * Paginated notification feed.
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()->cursorPaginate(20);

        return response()->json([
            'data' => collect($notifications->items())->map(fn (DatabaseNotification $notification) => [
                'id' => $notification->id,
                ...$notification->data,
                'read_at' => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at->toIso8601String(),
            ]),
            'meta' => [
                'next_cursor' => $notifications->nextCursor()?->encode(),
                'unread' => $request->user()->unreadNotifications()->count(),
            ],
        ]);
    }

    /**
     * Mark one notification as read.
     */
    public function markRead(Request $request, string $notification): JsonResponse
    {
        $request->user()->notifications()->whereKey($notification)->firstOrFail()->markAsRead();

        return response()->json(['message' => 'ok']);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'ok']);
    }
}
