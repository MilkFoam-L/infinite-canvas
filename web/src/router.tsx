import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import { AnalyticsTracker } from "@/components/layout/analytics-tracker";
import UserLayout from "@/layouts/user-layout";
import { APOPHISCODE_EMBED } from "@/lib/apophiscode-embed";
import AssetsPage from "@/pages/assets";
import CanvasPage from "@/pages/canvas";
import CanvasProjectPage from "@/pages/canvas/project";
import ConfigPage from "@/pages/config";
import HomePage from "@/pages/home";
import ImagePage from "@/pages/image";
import NotFound from "@/pages/not-found";
import PromptsPage from "@/pages/prompts";
import VideoPage from "@/pages/video";

export const router = createBrowserRouter(
    [
        {
            element: (
                <UserLayout>
                    <AnalyticsTracker />
                    <Outlet />
                </UserLayout>
            ),
            children: [
                { path: "/canvas", element: <CanvasPage /> },
                { path: "/canvas/:id", element: <CanvasProjectPage /> },
                // The embed keeps only the canvas; the host loads app.html because its Go file server redirects directory requests.
                ...(APOPHISCODE_EMBED
                    ? [{ path: "*", element: <Navigate to="/canvas" replace /> }]
                    : [
                          { path: "/", element: <HomePage /> },
                          { path: "/image", element: <ImagePage /> },
                          { path: "/video", element: <VideoPage /> },
                          { path: "/assets", element: <AssetsPage /> },
                          { path: "/prompts", element: <PromptsPage /> },
                          { path: "/config", element: <ConfigPage /> },
                      ]),
            ],
        },
        { path: "*", element: <NotFound /> },
    ],
    { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
);
