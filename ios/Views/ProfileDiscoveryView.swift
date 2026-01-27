import SwiftUI
import Observation

// MARK: - Data Models

/// Represents a user profile in the discovery feed
struct Profile: Identifiable, Equatable {
    let id: UUID
    let name: String
    let age: Int
    let distance: String
    let matchPercentage: Int
    let isOnline: Bool
    let isVerified: Bool
    let imageURL: String
    let bio: String
    let interests: [String]
}

/// Status indicating user's current availability
enum RightNowStatus: String, CaseIterable {
    case available = "Available Now"
    case busy = "Busy"
    case offline = "Offline"
    
    var color: Color {
        switch self {
        case .available: return .lime
        case .busy: return .hotOrange
        case .offline: return .secondary
        }
    }
    
    var icon: String {
        switch self {
        case .available: return "bolt.fill"
        case .busy: return "moon.fill"
        case .offline: return "circle"
        }
    }
}

// MARK: - Observable State

/// Manages the state for profile discovery
@Observable
final class ProfileDiscoveryViewModel {
    var profiles: [Profile] = []
    var selectedProfile: Profile?
    var isLoading = false
    var errorMessage: String?
    var filterDistance: Double = 50
    var showOnlineOnly = false
    
    var filteredProfiles: [Profile] {
        profiles.filter { profile in
            if showOnlineOnly && !profile.isOnline {
                return false
            }
            return true
        }
    }
    
    func loadProfiles() async {
        isLoading = true
        errorMessage = nil
        
        // Simulate network delay
        try? await Task.sleep(for: .seconds(1))
        
        profiles = Self.mockProfiles
        isLoading = false
    }
    
    static let mockProfiles: [Profile] = [
        Profile(
            id: UUID(),
            name: "Alex",
            age: 28,
            distance: "0.3 mi",
            matchPercentage: 94,
            isOnline: true,
            isVerified: true,
            imageURL: "profile1",
            bio: "Music lover, coffee addict, and eternal optimist.",
            interests: ["Music", "Travel", "Coffee"]
        ),
        Profile(
            id: UUID(),
            name: "Jordan",
            age: 32,
            distance: "1.2 mi",
            matchPercentage: 87,
            isOnline: true,
            isVerified: false,
            imageURL: "profile2",
            bio: "Designer by day, DJ by night.",
            interests: ["Design", "Music", "Nightlife"]
        ),
        Profile(
            id: UUID(),
            name: "Sam",
            age: 25,
            distance: "2.8 mi",
            matchPercentage: 76,
            isOnline: false,
            isVerified: true,
            imageURL: "profile3",
            bio: "Fitness enthusiast looking for adventure.",
            interests: ["Fitness", "Hiking", "Photography"]
        )
    ]
}

// MARK: - Color Extensions (HOTMESS Brand Colors)

extension Color {
    /// Hot Pink - Primary brand color
    static let hotPink = Color(red: 1.0, green: 0.08, blue: 0.58)
    
    /// Cyan - Secondary accent
    static let hotCyan = Color(red: 0, green: 0.85, blue: 1.0)
    
    /// Gold - Premium features
    static let hotGold = Color(red: 1.0, green: 0.84, blue: 0)
    
    /// Lime - Online/Success states
    static let lime = Color(red: 0.22, green: 1.0, blue: 0.08)
    
    /// Orange - Right Now features
    static let hotOrange = Color(red: 1.0, green: 0.42, blue: 0.21)
    
    /// Purple - Accent
    static let hotPurple = Color(red: 0.69, green: 0.15, blue: 1.0)
    
    /// Surface color for cards
    static let surfaceLight = Color.white.opacity(0.05)
    static let surfaceMedium = Color.white.opacity(0.10)
    
    /// Border colors
    static let borderLight = Color.white.opacity(0.10)
    static let borderMedium = Color.white.opacity(0.20)
}

// MARK: - Main View

/// The main profile discovery view with grid layout
struct ProfileDiscoveryView: View {
    @State private var viewModel = ProfileDiscoveryViewModel()
    @State private var showFilters = false
    @State private var selectedCardID: UUID?
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    
    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                backgroundGradient
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Header stats
                        headerStats
                        
                        // Filter toggle
                        filterToggle
                        
                        // Profile grid
                        profileGrid
                    }
                    .padding()
                }
                .refreshable {
                    await viewModel.loadProfiles()
                }
            }
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    filterButton
                }
            }
            .sheet(isPresented: $showFilters) {
                FilterSheetView(
                    distance: $viewModel.filterDistance,
                    showOnlineOnly: $viewModel.showOnlineOnly
                )
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
            }
            .sheet(item: $viewModel.selectedProfile) { profile in
                ProfileDetailView(profile: profile)
                    .presentationDetents([.large])
            }
        }
        .preferredColorScheme(.dark) // HOTMESS is dark-mode first
        .task {
            await viewModel.loadProfiles()
        }
    }
    
    // MARK: - Background
    
    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                Color.black,
                Color.hotPink.opacity(0.1),
                Color.black
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
    
    // MARK: - Header Stats
    
    private var headerStats: some View {
        HStack(spacing: 16) {
            StatBadge(
                value: "\(viewModel.filteredProfiles.count)",
                label: "Nearby",
                color: .hotCyan
            )
            
            StatBadge(
                value: "\(viewModel.profiles.filter(\.isOnline).count)",
                label: "Online",
                color: .lime
            )
            
            StatBadge(
                value: "87%",
                label: "Top Match",
                color: .hotPink
            )
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Discovery stats: \(viewModel.filteredProfiles.count) nearby, \(viewModel.profiles.filter(\.isOnline).count) online")
    }
    
    // MARK: - Filter Toggle
    
    private var filterToggle: some View {
        HStack {
            Toggle(isOn: $viewModel.showOnlineOnly.animation(.spring())) {
                Label("Online Only", systemImage: "bolt.fill")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .toggleStyle(SwitchToggleStyle(tint: .lime))
            .accessibilityHint("Filter to show only users who are currently online")
            
            Spacer()
        }
        .padding(.horizontal, 4)
    }
    
    // MARK: - Profile Grid
    
    private var profileGrid: some View {
        Group {
            if viewModel.isLoading {
                loadingView
            } else if viewModel.filteredProfiles.isEmpty {
                emptyStateView
            } else {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(viewModel.filteredProfiles) { profile in
                        ProfileCard(
                            profile: profile,
                            isSelected: selectedCardID == profile.id
                        )
                        .onTapGesture {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                selectedCardID = profile.id
                            }
                            
                            // Haptic feedback
                            let impact = UIImpactFeedbackGenerator(style: .medium)
                            impact.impactOccurred()
                            
                            // Delay to show selection, then present detail
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                                viewModel.selectedProfile = profile
                                selectedCardID = nil
                            }
                        }
                        .accessibilityAddTraits(.isButton)
                        .accessibilityHint("Double tap to view \(profile.name)'s full profile")
                    }
                }
                .animation(.spring(response: 0.4, dampingFraction: 0.8), value: viewModel.filteredProfiles)
            }
        }
    }
    
    // MARK: - Loading View
    
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(.hotPink)
            
            Text("Finding people nearby...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
        .accessibilityLabel("Loading profiles")
    }
    
    // MARK: - Empty State
    
    private var emptyStateView: some View {
        ContentUnavailableView {
            Label("No One Nearby", systemImage: "person.slash")
                .foregroundStyle(.secondary)
        } description: {
            Text("Try expanding your distance filter or check back later.")
        } actions: {
            Button("Adjust Filters") {
                showFilters = true
            }
            .buttonStyle(.borderedProminent)
            .tint(.hotPink)
        }
        .accessibilityElement(children: .combine)
    }
    
    // MARK: - Filter Button
    
    private var filterButton: some View {
        Button {
            showFilters = true
        } label: {
            Image(systemName: "slider.horizontal.3")
                .font(.body.weight(.medium))
                .foregroundStyle(.hotCyan)
        }
        .accessibilityLabel("Filters")
        .accessibilityHint("Opens filter options for distance and availability")
    }
}

// MARK: - Profile Card Component

/// A card displaying a single profile in the grid
struct ProfileCard: View {
    let profile: Profile
    var isSelected: Bool = false
    
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    
    private var cardHeight: CGFloat {
        dynamicTypeSize >= .accessibility1 ? 280 : 220
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Image area
            ZStack(alignment: .topTrailing) {
                // Profile image placeholder
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [.hotPink.opacity(0.3), .hotPurple.opacity(0.3)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay {
                        Image(systemName: "person.fill")
                            .font(.system(size: 40))
                            .foregroundStyle(.white.opacity(0.5))
                    }
                
                // Online indicator
                if profile.isOnline {
                    OnlineIndicator()
                        .padding(8)
                }
                
                // Match percentage badge
                MatchBadge(percentage: profile.matchPercentage)
                    .padding(8)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
            }
            .frame(height: cardHeight * 0.65)
            
            // Info area
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Text(profile.name)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .lineLimit(1)
                    
                    Text(", \(profile.age)")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                    
                    if profile.isVerified {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption)
                            .foregroundStyle(.hotCyan)
                            .accessibilityLabel("Verified")
                    }
                }
                
                HStack(spacing: 4) {
                    Image(systemName: "location.fill")
                        .font(.caption2)
                        .foregroundStyle(.hotPink)
                    
                    Text(profile.distance)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.surfaceMedium)
        }
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(
                    isSelected ? Color.hotPink : Color.borderLight,
                    lineWidth: isSelected ? 2 : 1
                )
        }
        .scaleEffect(isSelected ? 0.95 : 1.0)
        .shadow(
            color: isSelected ? .hotPink.opacity(0.3) : .clear,
            radius: 8,
            x: 0,
            y: 4
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(profile.name), \(profile.age) years old")
        .accessibilityValue("\(profile.matchPercentage)% match, \(profile.distance) away\(profile.isOnline ? ", online now" : "")\(profile.isVerified ? ", verified" : "")")
    }
}

// MARK: - Supporting Components

/// Animated online status indicator
struct OnlineIndicator: View {
    @State private var isPulsing = false
    
    var body: some View {
        Circle()
            .fill(.lime)
            .frame(width: 12, height: 12)
            .overlay {
                Circle()
                    .stroke(.lime.opacity(0.5), lineWidth: 2)
                    .scaleEffect(isPulsing ? 1.8 : 1.0)
                    .opacity(isPulsing ? 0 : 1)
            }
            .onAppear {
                withAnimation(.easeOut(duration: 1.2).repeatForever(autoreverses: false)) {
                    isPulsing = true
                }
            }
            .accessibilityHidden(true)
    }
}

/// Match percentage badge
struct MatchBadge: View {
    let percentage: Int
    
    private var badgeColor: Color {
        switch percentage {
        case 90...100: return .hotPink
        case 75..<90: return .hotCyan
        case 50..<75: return .hotGold
        default: return .secondary
        }
    }
    
    var body: some View {
        Text("\(percentage)%")
            .font(.caption.weight(.bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(badgeColor.opacity(0.9))
                    .background(
                        Capsule()
                            .fill(.ultraThinMaterial)
                    )
            )
            .accessibilityHidden(true)
    }
}

/// Stat badge for header
struct StatBadge: View {
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2.weight(.bold))
                .foregroundStyle(color)
            
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.surfaceLight)
                .overlay {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.borderLight, lineWidth: 1)
                }
        )
    }
}

// MARK: - Filter Sheet

/// Bottom sheet for filtering profiles
struct FilterSheetView: View {
    @Binding var distance: Double
    @Binding var showOnlineOnly: Bool
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Distance")
                            Spacer()
                            Text("\(Int(distance)) mi")
                                .foregroundStyle(.hotCyan)
                                .fontWeight(.medium)
                        }
                        
                        Slider(value: $distance, in: 1...100, step: 1)
                            .tint(.hotPink)
                            .accessibilityLabel("Maximum distance")
                            .accessibilityValue("\(Int(distance)) miles")
                    }
                } header: {
                    Text("Distance")
                }
                
                Section {
                    Toggle("Show Online Only", isOn: $showOnlineOnly)
                        .tint(.lime)
                        .accessibilityHint("When enabled, only shows users who are currently online")
                } header: {
                    Text("Availability")
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.black)
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .foregroundStyle(.hotPink)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

// MARK: - Profile Detail View

/// Full profile detail view presented as a sheet
struct ProfileDetailView: View {
    let profile: Profile
    @Environment(\.dismiss) private var dismiss
    @State private var showMessageSheet = false
    @State private var isLiked = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Hero image
                    heroImage
                    
                    // Profile info
                    profileInfo
                    
                    // Bio section
                    bioSection
                    
                    // Interests
                    interestsSection
                    
                    // Action buttons
                    actionButtons
                }
                .padding()
            }
            .background(Color.black)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.body.weight(.medium))
                            .foregroundStyle(.secondary)
                    }
                    .accessibilityLabel("Close profile")
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Share Profile", systemImage: "square.and.arrow.up") {}
                        Button("Block User", systemImage: "nosign", role: .destructive) {}
                        Button("Report", systemImage: "flag", role: .destructive) {}
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.body.weight(.medium))
                            .foregroundStyle(.secondary)
                    }
                    .accessibilityLabel("More options")
                }
            }
        }
        .preferredColorScheme(.dark)
    }
    
    // MARK: - Hero Image
    
    private var heroImage: some View {
        ZStack(alignment: .bottomLeading) {
            // Image placeholder
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [.hotPink.opacity(0.4), .hotPurple.opacity(0.4)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(height: 400)
                .overlay {
                    Image(systemName: "person.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(.white.opacity(0.3))
                }
            
            // Gradient overlay
            LinearGradient(
                colors: [.clear, .black.opacity(0.8)],
                startPoint: .top,
                endPoint: .bottom
            )
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            
            // Status badges
            HStack(spacing: 8) {
                if profile.isOnline {
                    statusBadge(
                        icon: "bolt.fill",
                        text: "Online Now",
                        color: .lime
                    )
                }
                
                statusBadge(
                    icon: "heart.fill",
                    text: "\(profile.matchPercentage)% Match",
                    color: .hotPink
                )
            }
            .padding()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(profile.name)'s profile photo")
    }
    
    private func statusBadge(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption.weight(.semibold))
            Text(text)
                .font(.caption.weight(.semibold))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(.ultraThinMaterial)
        )
    }
    
    // MARK: - Profile Info
    
    private var profileInfo: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                Text(profile.name)
                    .font(.title.weight(.bold))
                
                Text(", \(profile.age)")
                    .font(.title)
                    .foregroundStyle(.secondary)
                
                if profile.isVerified {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(.hotCyan)
                }
            }
            
            HStack(spacing: 16) {
                Label(profile.distance, systemImage: "location.fill")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                
                Label("12 min walk", systemImage: "figure.walk")
                    .font(.subheadline)
                    .foregroundStyle(.hotCyan)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(profile.name), \(profile.age) years old\(profile.isVerified ? ", verified" : ""), \(profile.distance) away")
    }
    
    // MARK: - Bio Section
    
    private var bioSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("About")
                .font(.headline)
                .foregroundStyle(.secondary)
            
            Text(profile.bio)
                .font(.body)
                .foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.surfaceLight)
        )
    }
    
    // MARK: - Interests Section
    
    private var interestsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Interests")
                .font(.headline)
                .foregroundStyle(.secondary)
            
            FlowLayout(spacing: 8) {
                ForEach(profile.interests, id: \.self) { interest in
                    Text(interest)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(
                            Capsule()
                                .fill(Color.hotPink.opacity(0.3))
                                .overlay {
                                    Capsule()
                                        .stroke(Color.hotPink.opacity(0.5), lineWidth: 1)
                                }
                        )
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Interests: \(profile.interests.joined(separator: ", "))")
    }
    
    // MARK: - Action Buttons
    
    private var actionButtons: some View {
        HStack(spacing: 16) {
            // Like button
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    isLiked.toggle()
                }
                let impact = UIImpactFeedbackGenerator(style: .medium)
                impact.impactOccurred()
            } label: {
                Image(systemName: isLiked ? "heart.fill" : "heart")
                    .font(.title2)
                    .foregroundStyle(isLiked ? .hotPink : .white)
                    .frame(width: 56, height: 56)
                    .background(
                        Circle()
                            .fill(isLiked ? Color.hotPink.opacity(0.2) : Color.surfaceMedium)
                            .overlay {
                                Circle()
                                    .stroke(isLiked ? Color.hotPink : Color.borderMedium, lineWidth: 1)
                            }
                    )
            }
            .scaleEffect(isLiked ? 1.1 : 1.0)
            .accessibilityLabel(isLiked ? "Unlike" : "Like")
            .accessibilityHint("Double tap to \(isLiked ? "remove like" : "like") this profile")
            
            // Message button
            Button {
                showMessageSheet = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "paperplane.fill")
                    Text("Message")
                        .fontWeight(.semibold)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(
                    LinearGradient(
                        colors: [.hotPink, .hotPurple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(Capsule())
            }
            .accessibilityHint("Opens a new conversation with \(profile.name)")
        }
        .padding(.top, 8)
    }
}

// MARK: - Flow Layout (for interests tags)

/// A custom layout that wraps content to new lines
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(proposal: proposal, subviews: subviews)
        return result.size
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(proposal: proposal, subviews: subviews)
        
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x,
                                       y: bounds.minY + result.positions[index].y),
                          proposal: .unspecified)
        }
    }
    
    private func layout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            
            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            
            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
        }
        
        return (CGSize(width: maxWidth, height: currentY + lineHeight), positions)
    }
}

// MARK: - Preview

#Preview("Discovery View") {
    ProfileDiscoveryView()
}

#Preview("Profile Card") {
    ProfileCard(
        profile: ProfileDiscoveryViewModel.mockProfiles[0]
    )
    .frame(width: 180)
    .padding()
    .background(Color.black)
    .preferredColorScheme(.dark)
}

#Preview("Profile Detail") {
    ProfileDetailView(
        profile: ProfileDiscoveryViewModel.mockProfiles[0]
    )
}
