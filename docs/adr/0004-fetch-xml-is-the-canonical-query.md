---
status: accepted
---

# Fetch XML is the canonical form of a Query

The Query Builder lets a user write a Query as a tree or as Fetch XML and emits it in other Dialects. We made Fetch XML the canonical form: the model is a typed tree that mirrors the Fetch XML schema one-to-one, the tree and the XML pane are two editors over that one model, and anything the model does not recognise (an attribute or element added to the platform after we shipped) is carried through a parse and serialise untouched. Every other Dialect is a one-way output that warns when the Query uses something it cannot express. People paste Fetch XML from views, plug-ins and colleagues and expect to get back exactly what they pasted plus their edit; a model that silently drops what it does not understand cannot be trusted for testing.

## Considered options

- **A dialect-neutral query model with Fetch XML as one output among equals**: rejected. It reads cleaner and would make pasting a Web API URL symmetrical with pasting Fetch XML, but it can only hold what we thought to model, so it loses fidelity the first time a Query uses a feature we did not anticipate.
- **Text as the only source of truth, with the tree as a read-only outline**: rejected. Editing in the tree is the point of the Workspace.

## Consequences

Reading another Dialect in (a Web API URL, SQL) means translating it to Fetch XML, never adding a second model beside this one. A tree edit regenerates the whole XML in standard formatting, keeping comments but not hand-made indentation or attribute order; typing in the XML pane never reformats. The model has to keep source positions and unknown nodes, which rules out parsing straight into a lossy typed object.
