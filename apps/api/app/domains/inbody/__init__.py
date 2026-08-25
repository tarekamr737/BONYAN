__all__ = ["InBodyService", "router"]


def __getattr__(name: str):
    if name == "InBodyService":
        from app.domains.inbody.service import InBodyService

        return InBodyService
    if name == "router":
        from app.domains.inbody.router import router

        return router
    raise AttributeError(name)
